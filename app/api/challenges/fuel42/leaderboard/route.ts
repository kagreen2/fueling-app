import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  FUEL42_END_DATE,
  FUEL42_START_DATE,
  getBodyFatPoints,
  getDefaultLeaderboardName,
  getFuel42WeekIndex,
  getMusclePoints,
  hasWorkoutActivity,
  makeEmptyFuel42Points,
  totalFuel42Points,
} from '@/lib/fuel42/challenge'

function getAdminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Checkin = { athlete_id: string; date: string; training_type: string | null; body_weight_lbs: number | null }
type Meal = { athlete_id: string; date: string }

function addDailyPoints(checkins: Checkin[], meals: Meal[]) {
  const pointsByAthlete = new Map<string, ReturnType<typeof makeEmptyFuel42Points>>()
  const checkinsByAthleteDate = new Map<string, Checkin>()
  const mealCountByAthleteDate = new Map<string, number>()

  for (const checkin of checkins) {
    const key = `${checkin.athlete_id}:${checkin.date}`
    checkinsByAthleteDate.set(key, checkin)
    if (!pointsByAthlete.has(checkin.athlete_id)) pointsByAthlete.set(checkin.athlete_id, makeEmptyFuel42Points())
  }
  for (const meal of meals) {
    const key = `${meal.athlete_id}:${meal.date}`
    mealCountByAthleteDate.set(key, (mealCountByAthleteDate.get(key) || 0) + 1)
    if (!pointsByAthlete.has(meal.athlete_id)) pointsByAthlete.set(meal.athlete_id, makeEmptyFuel42Points())
  }

  const workoutDaysByAthleteWeek = new Map<string, Set<string>>()
  const weighInWeeksByAthlete = new Map<string, Set<number>>()
  for (const [key, checkin] of checkinsByAthleteDate.entries()) {
    const current = pointsByAthlete.get(checkin.athlete_id) || makeEmptyFuel42Points()
    current.checkin += 2
    pointsByAthlete.set(checkin.athlete_id, current)
    const week = getFuel42WeekIndex(checkin.date)
    if (week && hasWorkoutActivity(checkin.training_type)) {
      const workoutDays = workoutDaysByAthleteWeek.get(`${checkin.athlete_id}:${week}`) || new Set<string>()
      workoutDays.add(checkin.date)
      workoutDaysByAthleteWeek.set(`${checkin.athlete_id}:${week}`, workoutDays)
    }
    if (week && checkin.body_weight_lbs != null) {
      const weeks = weighInWeeksByAthlete.get(checkin.athlete_id) || new Set<number>()
      weeks.add(week)
      weighInWeeksByAthlete.set(checkin.athlete_id, weeks)
    }
  }
  for (const [key, workoutDays] of workoutDaysByAthleteWeek) {
    const athleteId = key.split(':')[0]
    const current = pointsByAthlete.get(athleteId) || makeEmptyFuel42Points()
    current.workouts += Math.min(workoutDays.size, 5)
    pointsByAthlete.set(athleteId, current)
  }
  for (const [key, mealCount] of mealCountByAthleteDate) {
    const athleteId = key.split(':')[0]
    const current = pointsByAthlete.get(athleteId) || makeEmptyFuel42Points()
    current.meals += mealCount >= 2 ? 2 : 1
    pointsByAthlete.set(athleteId, current)
  }
  for (const [athleteId, weeks] of weighInWeeksByAthlete) {
    const current = pointsByAthlete.get(athleteId) || makeEmptyFuel42Points()
    current.weighIns = weeks.size
    pointsByAthlete.set(athleteId, current)
  }
  return pointsByAthlete
}

export async function GET() {
  try {
    const auth = await createServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const admin = getAdminClient()
    const { data: viewerEnrollment } = await admin
      .from('fuel42_enrollments')
      .select('athlete_id')
      .eq('participant_profile_id', user.id)
      .in('status', ['claimed', 'onboarding_complete'])
      .gt('access_expires_at', new Date().toISOString())
      .maybeSingle()
    if (!viewerEnrollment?.athlete_id) return NextResponse.json({ error: 'An active FUEL 42 enrollment is required.' }, { status: 403 })

    const { data: enrollments, error: enrollmentError } = await admin
      .from('fuel42_enrollments')
      .select('athlete_id, participant_profile_id')
      .eq('status', 'onboarding_complete')
      .gt('access_expires_at', new Date().toISOString())
      .not('athlete_id', 'is', null)
    if (enrollmentError) throw enrollmentError
    const athleteIds = (enrollments || []).map(row => row.athlete_id).filter(Boolean) as string[]
    if (athleteIds.length === 0) return NextResponse.json({ entries: [], me: null, startDate: FUEL42_START_DATE, endDate: FUEL42_END_DATE })

    const profileIds = (enrollments || []).map(row => row.participant_profile_id).filter(Boolean) as string[]
    const [{ data: challengeProfiles }, { data: profiles }, { data: checkins }, { data: meals }] = await Promise.all([
      admin.from('fuel42_challenge_profiles').select('*').in('athlete_id', athleteIds),
      admin.from('profiles').select('id, full_name, first_name').in('id', profileIds),
      admin.from('daily_checkins').select('athlete_id, date, training_type, body_weight_lbs').in('athlete_id', athleteIds).gte('date', FUEL42_START_DATE).lte('date', FUEL42_END_DATE),
      admin.from('meal_logs').select('athlete_id, date').in('athlete_id', athleteIds).gte('date', FUEL42_START_DATE).lte('date', FUEL42_END_DATE),
    ])

    const profileById = new Map((profiles || []).map(profile => [profile.id, profile]))
    const enrollmentByAthlete = new Map((enrollments || []).map(enrollment => [enrollment.athlete_id!, enrollment]))
    const challengeByAthlete = new Map((challengeProfiles || []).map(profile => [profile.athlete_id, profile]))
    const scanIds = (challengeProfiles || []).flatMap(profile => [profile.starting_scan_id, profile.final_scan_id]).filter(Boolean) as string[]
    const { data: scans } = scanIds.length > 0
      ? await admin.from('biometric_scans').select('id, percent_body_fat, skeletal_muscle_mass_lbs').in('id', scanIds)
      : { data: [] as Array<{ id: string; percent_body_fat: number | null; skeletal_muscle_mass_lbs: number | null }> }
    const scansById = new Map((scans || []).map(scan => [scan.id, scan]))
    const pointsByAthlete = addDailyPoints((checkins || []) as Checkin[], (meals || []) as Meal[])

    const rawEntries = athleteIds.map(athleteId => {
      const challenge = challengeByAthlete.get(athleteId)
      const enrollment = enrollmentByAthlete.get(athleteId)
      const participant = enrollment?.participant_profile_id ? profileById.get(enrollment.participant_profile_id) : null
      const current = pointsByAthlete.get(athleteId) || makeEmptyFuel42Points()
      if (challenge?.body_comp_verified_at && challenge?.body_comp_consent) {
        const start = challenge.starting_scan_id ? scansById.get(challenge.starting_scan_id) : null
        const final = challenge.final_scan_id ? scansById.get(challenge.final_scan_id) : null
        if (final) current.finalScan = 5
        current.bodyFat = getBodyFatPoints(start?.percent_body_fat, final?.percent_body_fat)
        current.muscle = getMusclePoints(start?.skeletal_muscle_mass_lbs, final?.skeletal_muscle_mass_lbs)
      }
      const totals = totalFuel42Points(current)
      const displayName = challenge?.leaderboard_display_name || getDefaultLeaderboardName(participant?.full_name, participant?.first_name)
      return { athleteId, optIn: Boolean(challenge?.intake_completed_at) && challenge?.leaderboard_opt_in !== false, displayName, points: totals }
    })

    const publicEntries = rawEntries.filter(entry => entry.optIn).sort((a, b) => b.points.total - a.points.total || b.points.checkin - a.points.checkin)
    const entries = publicEntries.map((entry, index) => ({ rank: index + 1, displayName: entry.displayName, points: entry.points }))
    const viewer = rawEntries.find(entry => entry.athleteId === viewerEnrollment.athlete_id)
    const publicRank = viewer?.optIn ? publicEntries.findIndex(entry => entry.athleteId === viewer?.athleteId) + 1 : null
    return NextResponse.json({
      startDate: FUEL42_START_DATE,
      endDate: FUEL42_END_DATE,
      entries,
      me: viewer ? { rank: publicRank || null, isVisible: viewer.optIn, displayName: viewer.displayName, points: viewer.points } : null,
    })
  } catch (error: any) {
    console.error('FUEL 42 leaderboard error:', error)
    return NextResponse.json({ error: error.message || 'Unable to load leaderboard.' }, { status: 500 })
  }
}
