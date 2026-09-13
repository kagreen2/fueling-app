import { NextResponse } from 'next/server'
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
  if (authError || !user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { user, profile }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('fuel42_enrollments')
    .select('id, full_name, email, phone, package_key, package_name, amount_cents, payment_status, status, access_expires_at, setup_email_sent_at, setup_token_used_at, onboarding_completed_at, athlete_id, coach_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Unable to load FUEL 42 enrollments:', error)
    return NextResponse.json({ error: 'Unable to load FUEL 42 enrollments. Confirm that FUEL42-SETUP.sql has been run in Supabase.' }, { status: 500 })
  }

  const athleteIds = (data || []).map(enrollment => enrollment.athlete_id).filter(Boolean) as string[]
  const { data: challengeProfiles, error: challengeProfileError } = athleteIds.length > 0
    ? await supabaseAdmin
      .from('fuel42_challenge_profiles')
      .select('athlete_id, leaderboard_display_name, leaderboard_opt_in, intake_completed_at')
      .in('athlete_id', athleteIds)
    : { data: [], error: null }

  if (challengeProfileError) {
    console.error('Unable to load FUEL 42 public leaderboard preferences:', challengeProfileError)
    return NextResponse.json({ error: 'Unable to load FUEL 42 participant display settings.' }, { status: 500 })
  }

  const challengeByAthlete = new Map((challengeProfiles || []).map(profile => [profile.athlete_id, profile]))
  const enrollments = (data || []).map(enrollment => {
    const challenge = enrollment.athlete_id ? challengeByAthlete.get(enrollment.athlete_id) : null
    return {
      ...enrollment,
      leaderboard_display_name: challenge?.leaderboard_display_name || null,
      leaderboard_opt_in: challenge?.leaderboard_opt_in ?? null,
      challenge_intake_completed: Boolean(challenge?.intake_completed_at),
    }
  })

  return NextResponse.json({ enrollments })
}
