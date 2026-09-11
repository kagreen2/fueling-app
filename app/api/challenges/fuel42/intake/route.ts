import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { FUEL42_TARGET_DATE, getDefaultLeaderboardName } from '@/lib/fuel42/challenge'

function getAdminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function validOptionalNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

async function getParticipantContext() {
  const auth = await createServerClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const admin = getAdminClient()
  const { data: enrollment } = await admin
    .from('fuel42_enrollments')
    .select('id, athlete_id, access_expires_at, status')
    .eq('participant_profile_id', user.id)
    .in('status', ['claimed', 'onboarding_complete'])
    .gt('access_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!enrollment?.athlete_id) return { error: NextResponse.json({ error: 'An active FUEL 42 enrollment is required.' }, { status: 403 }) }
  return { admin, user, enrollment }
}

export async function GET() {
  try {
    const context = await getParticipantContext()
    if ('error' in context) return context.error
    const { admin, user, enrollment } = context

    const [{ data: profile }, { data: athlete }, { data: latestScan }, { data: challengeProfile }] = await Promise.all([
      admin.from('profiles').select('full_name, first_name').eq('id', user.id).single(),
      admin.from('athletes').select('weight_lbs, body_fat_percentage, training_schedule, activity_level, training_style, goal_phase').eq('id', enrollment.athlete_id).single(),
      admin.from('biometric_scans').select('id, scan_date, weight_lbs, percent_body_fat, skeletal_muscle_mass_lbs').eq('athlete_id', enrollment.athlete_id).order('scan_date', { ascending: false }).limit(1).maybeSingle(),
      admin.from('fuel42_challenge_profiles').select('*').eq('athlete_id', enrollment.athlete_id).maybeSingle(),
    ])

    return NextResponse.json({
      challenge: challengeProfile || {
        target_date: FUEL42_TARGET_DATE,
        leaderboard_opt_in: true,
        leaderboard_display_name: getDefaultLeaderboardName(profile?.full_name, profile?.first_name),
        weight_management_support: 'prefer_not_to_say',
        body_comp_consent: false,
      },
      athlete: athlete || {},
      latestScan: latestScan || null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load FUEL 42 intake.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getParticipantContext()
    if ('error' in context) return context.error
    const { admin, enrollment } = context
    const body = await req.json()
    const targetDate = typeof body.targetDate === 'string' && body.targetDate >= '2026-09-14' && body.targetDate <= FUEL42_TARGET_DATE
      ? body.targetDate
      : FUEL42_TARGET_DATE
    const support = ['no', 'yes', 'prefer_not_to_say'].includes(body.weightManagementSupport) ? body.weightManagementSupport : 'prefer_not_to_say'
    const { data: latestScan } = await admin
      .from('biometric_scans')
      .select('id')
      .eq('athlete_id', enrollment.athlete_id)
      .order('scan_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const record = {
      athlete_id: enrollment.athlete_id,
      enrollment_id: enrollment.id,
      primary_goal: typeof body.primaryGoal === 'string' ? body.primaryGoal.slice(0, 80) : null,
      goal_weight_lbs: validOptionalNumber(body.goalWeightLbs, 60, 800),
      goal_body_fat_percentage: validOptionalNumber(body.goalBodyFatPercentage, 2, 75),
      target_date: targetDate,
      baseline_habit: typeof body.baselineHabit === 'string' ? body.baselineHabit.slice(0, 500) : null,
      nutrition_challenge: typeof body.nutritionChallenge === 'string' ? body.nutritionChallenge.slice(0, 500) : null,
      lifestyle_schedule: typeof body.lifestyleSchedule === 'string' ? body.lifestyleSchedule.slice(0, 500) : null,
      dining_out_frequency: typeof body.diningOutFrequency === 'string' ? body.diningOutFrequency.slice(0, 80) : null,
      meal_prep_preference: typeof body.mealPrepPreference === 'string' ? body.mealPrepPreference.slice(0, 80) : null,
      challenge_success_statement: typeof body.successStatement === 'string' ? body.successStatement.slice(0, 800) : null,
      coach_context: typeof body.coachContext === 'string' ? body.coachContext.slice(0, 1000) : null,
      weight_management_support: support,
      weight_management_context: support === 'yes' && typeof body.weightManagementContext === 'string' ? body.weightManagementContext.slice(0, 600) : null,
      leaderboard_opt_in: body.leaderboardOptIn !== false,
      leaderboard_display_name: typeof body.leaderboardDisplayName === 'string' ? body.leaderboardDisplayName.trim().slice(0, 40) || null : null,
      body_comp_consent: body.bodyCompConsent === true,
      starting_scan_id: latestScan?.id || null,
      intake_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('fuel42_challenge_profiles')
      .upsert(record, { onConflict: 'athlete_id' })
      .select()
      .single()
    if (error) throw error
    try {
      await fetch(new URL('/api/recommendations/generate', req.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ athleteId: enrollment.athlete_id }),
      })
    } catch (recommendationError) {
      console.error('Unable to refresh FUEL 42 macro targets:', recommendationError)
    }
    return NextResponse.json({ challenge: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to save FUEL 42 intake.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
