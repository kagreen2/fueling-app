import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { calculateNutritionRecommendation } from '@/lib/nutrition-calculator'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check - verify user is logged in
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { athleteId } = await request.json()
    
    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
    }

    // Check role — admins, coaches, and the athlete themselves can generate
    const { data: profile } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminOrCoach = profile && ['admin', 'super_admin', 'coach'].includes(profile.role)

    // If not admin/coach, verify the user owns this athlete record (self-generation during onboarding)
    if (!isAdminOrCoach) {
      const { data: ownAthlete } = await authSupabase
        .from('athletes')
        .select('id')
        .eq('id', athleteId)
        .eq('profile_id', user.id)
        .single()

      if (!ownAthlete) {
        return NextResponse.json({ error: 'Forbidden - you can only generate recommendations for your own profile' }, { status: 403 })
      }
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

    // Determine user type
    const userType = athlete.user_type || 'athlete'

    // Calculate age from DOB if available
    let age = athlete.age || 25
    if (athlete.dob) {
      const dob = new Date(athlete.dob)
      const today = new Date()
      age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
    }
    // Sanity clamp: age must be between 10 and 100
    if (age < 10 || age > 100) {
      console.warn(`Invalid age calculated: ${age} from DOB ${athlete.dob}. Clamping to 25.`)
      age = 25
    }

    // Calculate cycle phase for female users who opted in
    let cyclePhase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | undefined
    if (athlete.sex === 'female' && athlete.cycle_tracking_enabled && athlete.last_period_start) {
      const lastPeriod = new Date(athlete.last_period_start)
      const today = new Date()
      const daysSince = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24))
      const cycleLength = athlete.avg_cycle_length || 28
      const dayOfCycle = (daysSince % cycleLength) + 1
      if (dayOfCycle <= 5) cyclePhase = 'menstrual'
      else if (dayOfCycle <= 13) cyclePhase = 'follicular'
      else if (dayOfCycle <= 16) cyclePhase = 'ovulatory'
      else cyclePhase = 'luteal'
    }

    // FUEL 42 participants can use their private target and latest body-composition data to refine the existing calculator.
    const { data: activeFuel42Enrollment } = await supabase
      .from('fuel42_enrollments')
      .select('id')
      .eq('athlete_id', athleteId)
      .eq('status', 'onboarding_complete')
      .gt('access_expires_at', new Date().toISOString())
      .maybeSingle()
    const { data: fuel42Challenge } = activeFuel42Enrollment
      ? await supabase.from('fuel42_challenge_profiles').select('primary_goal, goal_weight_lbs, goal_body_fat_percentage, target_date, intake_completed_at').eq('athlete_id', athleteId).maybeSingle()
      : { data: null }
    const calculationDate = new Date().toISOString().slice(0, 10)
    const fuel42AdjustmentActive = Boolean(
      activeFuel42Enrollment
      && fuel42Challenge?.intake_completed_at
      && calculationDate <= '2026-10-25'
    )

    // Prepare athlete profile for calculation
    const athleteProfile = {
      age,
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
      user_type: userType as 'athlete' | 'member',
      activity_level: athlete.activity_level || undefined,
      training_style: athlete.training_style || undefined,
      cycle_phase: cyclePhase,
      fuel42_goal_weight_lbs: fuel42Challenge?.goal_weight_lbs || undefined,
      fuel42_goal_body_fat_percentage: fuel42Challenge?.goal_body_fat_percentage || undefined,
      fuel42_fat_free_mass_lbs: latestScan?.fat_free_mass_lbs || undefined,
      fuel42_primary_goal: fuel42Challenge?.primary_goal || undefined,
      fuel42_target_date: fuel42Challenge?.target_date || undefined,
      fuel42_adjustment_active: fuel42AdjustmentActive,
      calculation_date: calculationDate,
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
  } catch (error: unknown) {
    console.error('Recommendation generation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
