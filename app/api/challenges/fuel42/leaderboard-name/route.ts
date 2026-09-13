import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizeDisplayName(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  if (normalized.length > 60) throw new Error('Leaderboard display names must be 60 characters or fewer.')
  return normalized
}

export async function PATCH(req: NextRequest) {
  try {
    const { enrollmentId, displayName } = await req.json()
    if (typeof enrollmentId !== 'string' || !enrollmentId) {
      return NextResponse.json({ error: 'Missing enrollment ID' }, { status: 400 })
    }

    let normalizedDisplayName: string | null
    try {
      normalizedDisplayName = normalizeDisplayName(displayName)
    } catch (validationError: unknown) {
      const message = validationError instanceof Error ? validationError.message : 'Invalid leaderboard display name.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: staffProfile } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!staffProfile || !['admin', 'super_admin'].includes(staffProfile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .select('id, athlete_id')
      .eq('id', enrollmentId)
      .single()
    if (enrollmentError || !enrollment?.athlete_id) {
      return NextResponse.json({ error: 'The participant must complete base onboarding before a leaderboard name can be edited.' }, { status: 409 })
    }

    const { data: challengeProfile, error: challengeProfileError } = await supabaseAdmin
      .from('fuel42_challenge_profiles')
      .select('athlete_id')
      .eq('athlete_id', enrollment.athlete_id)
      .eq('enrollment_id', enrollment.id)
      .maybeSingle()
    if (challengeProfileError) throw challengeProfileError
    if (!challengeProfile) {
      return NextResponse.json({ error: 'The participant must complete FUEL 42 challenge intake before a leaderboard name can be edited.' }, { status: 409 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('fuel42_challenge_profiles')
      .update({
        leaderboard_display_name: normalizedDisplayName,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', enrollment.athlete_id)
      .eq('enrollment_id', enrollment.id)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, displayName: normalizedDisplayName })
  } catch (error: unknown) {
    console.error('Unable to update FUEL 42 leaderboard display name:', error)
    const message = error instanceof Error ? error.message : 'Unable to update the leaderboard display name.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
