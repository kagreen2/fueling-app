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
