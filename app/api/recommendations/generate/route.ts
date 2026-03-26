import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { calculateNutritionRecommendation } from '@/lib/nutrition-calculator'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check - verify user is logged in and is admin or coach
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || !['admin', 'super_admin', 'coach'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - admin or coach access required' }, { status: 403 })
    }

    const { athleteId } = await request.json()
    
    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get athlete data
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Check for latest InBody biometric scan (for measured BMR)
    const { data: latestScan } = await supabase
      .from('biometric_scans')
      .select('weight_lbs, percent_body_fat, fat_free_mass_lbs')
      .eq('athlete_id', athleteId)
      .order('scan_date', { ascending: false })
      .limit(1)
      .single()

    // Calculate BMR from InBody data using Katch-McArdle if we have fat-free mass
    // Katch-McArdle: BMR = 370 + (21.6 × FFM in kg)
    // This is the gold standard when lean mass data is available from InBody
    let inbodyBmr: number | undefined
    if (latestScan?.fat_free_mass_lbs) {
      const ffm_kg = latestScan.fat_free_mass_lbs * 0.453592
      inbodyBmr = Math.round(370 + 21.6 * ffm_kg)
    }

    // Use InBody weight if available (more recent than profile weight)
    const weight = latestScan?.weight_lbs || athlete.weight_lbs || 150
    const bodyFat = latestScan?.percent_body_fat || athlete.body_fat_percentage

    // Prepare athlete profile for calculation
    const athleteProfile = {
      age: athlete.age || 16,
      sex: (athlete.sex || 'male') as 'male' | 'female',
      weight_lbs: weight,
      height_inches: athlete.height_inches || 70,
      body_fat_percentage: bodyFat,
      sport: athlete.sport || 'Unknown',
      position: athlete.position,
      goal_phase: athlete.goal_phase || 'maintain_performance',
      training_days_per_week: parseInt(athlete.training_schedule || '5'),
      season_phase: athlete.season_phase || 'offseason',
      inbody_bmr: inbodyBmr,
    }

    // Calculate evidence-based recommendations (pure math, no AI needed)
    const recommendation = calculateNutritionRecommendation(athleteProfile)

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('nutrition_recommendations')
      .upsert({
        athlete_id: athleteId,
        daily_calories: recommendation.daily_calories,
        daily_protein_g: recommendation.daily_protein_g,
        daily_carbs_g: recommendation.daily_carbs_g,
        daily_fat_g: recommendation.daily_fat_g,
        reasoning: recommendation.methodology,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id' })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...saved,
      methodology: recommendation.methodology,
      notes: recommendation.notes,
    })
  } catch (error: any) {
    console.error('Recommendation generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate recommendations' }, { status: 500 })
  }
}
