import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { user }
}

function numberOrZero(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const athleteId = request.nextUrl.searchParams.get('athlete_id')
  const startDate = request.nextUrl.searchParams.get('start')
  const endDate = request.nextUrl.searchParams.get('end')
  const compact = request.nextUrl.searchParams.get('compact') === '1'
  if (!athleteId) {
    return NextResponse.json({ error: 'athlete_id is required' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  let mealsQuery = supabaseAdmin
    .from('meal_logs')
    .select('*')
    .eq('athlete_id', athleteId)
  let summaryQuery = supabaseAdmin
    .from('coach_meal_summary')
    .select('date, total_calories, total_protein, meal_count')
    .eq('athlete_id', athleteId)

  if (startDate) {
    mealsQuery = mealsQuery.gte('date', startDate)
    summaryQuery = summaryQuery.gte('date', startDate)
  }
  if (endDate) {
    mealsQuery = mealsQuery.lte('date', endDate)
    summaryQuery = summaryQuery.lte('date', endDate)
  }

  const [athleteResult, recommendationResult, mealsResult, summaryResult] = await Promise.all([
    supabaseAdmin
      .from('athletes')
      .select('id, profile_id, created_at, profile:profiles(full_name, email)')
      .eq('id', athleteId)
      .single(),
    supabaseAdmin
      .from('nutrition_recommendations')
      .select('*')
      .eq('athlete_id', athleteId)
      .maybeSingle(),
    mealsQuery
      .order('date', { ascending: true })
      .order('logged_at', { ascending: true }),
    summaryQuery.order('date', { ascending: true }),
  ])

  if (athleteResult.error || !athleteResult.data) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
  }
  if (mealsResult.error) {
    console.error('Meal audit query failed:', mealsResult.error)
    return NextResponse.json({ error: 'Unable to load meal records' }, { status: 500 })
  }

  const meals = mealsResult.data || []
  const daily = new Map<string, {
    date: string
    calories: number
    protein: number
    carbs: number
    fat: number
    energy_from_macros: number
    meal_count: number
  }>()

  const auditMeals = meals.map((meal: Record<string, unknown>) => {
    const calories = numberOrZero(meal.calories)
    const protein = numberOrZero(meal.protein)
    const carbs = numberOrZero(meal.carbs)
    const fat = numberOrZero(meal.fat)
    const energyFromMacros = protein * 4 + carbs * 4 + fat * 9
    const date = String(meal.date || String(meal.created_at || '').slice(0, 10))
    const day = daily.get(date) || {
      date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      energy_from_macros: 0,
      meal_count: 0,
    }
    day.calories += calories
    day.protein += protein
    day.carbs += carbs
    day.fat += fat
    day.energy_from_macros += energyFromMacros
    day.meal_count += 1
    daily.set(date, day)

    return {
      id: meal.id,
      date,
      logged_at: meal.logged_at,
      created_at: meal.created_at,
      meal_title: meal.meal_title,
      description: meal.description,
      meal_type: meal.meal_type,
      calories,
      protein,
      carbs,
      fat,
      energy_from_macros: Math.round(energyFromMacros * 10) / 10,
      calorie_macro_delta: Math.round((calories - energyFromMacros) * 10) / 10,
      confidence: meal.confidence,
      source: meal.source ?? meal.input_method ?? meal.log_method ?? null,
      quantity: meal.quantity ?? null,
      serving_size: meal.serving_size ?? null,
      athlete_confirmed: meal.athlete_confirmed ?? null,
      athlete_correction: meal.athlete_correction ?? null,
      coach_override: meal.coach_override ?? null,
      estimated_calories: meal.est_calories ?? null,
      estimated_protein: meal.est_protein_g ?? null,
      estimated_carbs: meal.est_carbs_g ?? null,
      estimated_fat: meal.est_fat_g ?? null,
      ...(compact ? {} : { stored_fields: Object.keys(meal).sort() }),
    }
  })

  const dailyTotals = [...daily.values()].map(day => ({
    ...day,
    calories: Math.round(day.calories * 10) / 10,
    protein: Math.round(day.protein * 10) / 10,
    carbs: Math.round(day.carbs * 10) / 10,
    fat: Math.round(day.fat * 10) / 10,
    energy_from_macros: Math.round(day.energy_from_macros * 10) / 10,
    calorie_macro_delta: Math.round((day.calories - day.energy_from_macros) * 10) / 10,
  }))

  return NextResponse.json({
    athlete: athleteResult.data,
    recommendation: recommendationResult.data || null,
    meals: auditMeals,
    recalculated_daily_totals: dailyTotals,
    stored_coach_summaries: summaryResult.data || [],
  })
}
