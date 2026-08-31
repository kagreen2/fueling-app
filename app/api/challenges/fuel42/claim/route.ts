import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!isUuid(token)) return NextResponse.json({ error: 'This FUEL 42 setup link is invalid. Please contact Iron Flag Fitness.' }, { status: 400 })

    const authorization = req.headers.get('authorization')
    const authSupabase = authorization
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: authorization } },
        })
      : await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user?.email) return NextResponse.json({ error: 'Please sign in or create your account before continuing.' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .select('id, email, status, access_expires_at, setup_token_used_at, participant_profile_id')
      .eq('setup_token', token)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'This FUEL 42 setup link is no longer available. Please contact Iron Flag Fitness.' }, { status: 404 })
    }

    if (enrollment.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Use the same email address that was used to purchase FUEL 42.' }, { status: 403 })
    }

    if (new Date(enrollment.access_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Your FUEL 42 access period has ended. Please contact Iron Flag Fitness for next steps.' }, { status: 410 })
    }

    if (enrollment.setup_token_used_at && enrollment.participant_profile_id && enrollment.participant_profile_id !== user.id) {
      return NextResponse.json({ error: 'This FUEL 42 setup link has already been used. Please contact Iron Flag Fitness.' }, { status: 409 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        challenge_program: 'fuel42',
        challenge_access_until: enrollment.access_expires_at,
      })
      .eq('id', user.id)

    if (profileError) throw profileError

    const { error: updateError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .update({
        participant_profile_id: user.id,
        setup_token_used_at: enrollment.setup_token_used_at || new Date().toISOString(),
        status: enrollment.status === 'onboarding_complete' ? 'onboarding_complete' : 'claimed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)

    if (updateError) throw updateError
    return NextResponse.json({ success: true, next: '/athlete/onboarding?challenge=fuel42' })
  } catch (error: any) {
    console.error('Unable to claim FUEL 42 enrollment:', error)
    return NextResponse.json({ error: error.message || 'Unable to activate FUEL 42 access.' }, { status: 500 })
  }
}
