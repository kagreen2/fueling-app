import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { hasVerifiedFuel42Access } from '@/lib/fuel42/access'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isMissingChallengeProfileTable(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    const authSupabase = authorization
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: authorization } },
        })
      : await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .select('status, access_expires_at, athlete_id, onboarding_completed_at')
      .eq('participant_profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (enrollmentError) throw enrollmentError

    const eligible = hasVerifiedFuel42Access(enrollment ? {
      status: enrollment.status,
      accessExpiresAt: enrollment.access_expires_at,
    } : null)

    if (!eligible || !enrollment) {
      return NextResponse.json({
        eligible: false,
        enrollmentStatus: enrollment?.status || null,
        needsBaseOnboarding: false,
        needsChallengeIntake: false,
        challengeIntakeComplete: false,
        challengeProfileReady: true,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const needsBaseOnboarding = enrollment.status !== 'onboarding_complete'
      || !enrollment.athlete_id
      || !enrollment.onboarding_completed_at

    let challengeIntakeComplete = false
    let challengeProfileReady = true

    if (enrollment.athlete_id && !needsBaseOnboarding) {
      const { data: challengeProfile, error: challengeProfileError } = await supabaseAdmin
        .from('fuel42_challenge_profiles')
        .select('intake_completed_at')
        .eq('athlete_id', enrollment.athlete_id)
        .maybeSingle()

      if (challengeProfileError) {
        if (isMissingChallengeProfileTable(challengeProfileError)) challengeProfileReady = false
        else throw challengeProfileError
      } else {
        challengeIntakeComplete = Boolean(challengeProfile?.intake_completed_at)
      }
    }

    return NextResponse.json({
      eligible: true,
      enrollmentStatus: enrollment.status,
      needsBaseOnboarding,
      needsChallengeIntake: !needsBaseOnboarding && challengeProfileReady && !challengeIntakeComplete,
      challengeIntakeComplete,
      challengeProfileReady,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    console.error('Unable to load FUEL 42 enrollment status:', error)
    return NextResponse.json({ error: 'Unable to verify FUEL 42 access.' }, { status: 500 })
  }
}
