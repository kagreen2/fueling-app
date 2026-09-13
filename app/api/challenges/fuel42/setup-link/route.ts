import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { enrollmentId } = await req.json()
    if (typeof enrollmentId !== 'string' || !enrollmentId) {
      return NextResponse.json({ error: 'Missing enrollment ID' }, { status: 400 })
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
      .select('id, email, status, setup_token, access_expires_at')
      .eq('id', enrollmentId)
      .single()
    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'FUEL 42 participant not found.' }, { status: 404 })
    }
    if (['canceled', 'refunded', 'onboarding_complete'].includes(enrollment.status)) {
      return NextResponse.json({ error: 'A setup link is not available for this enrollment.' }, { status: 400 })
    }
    if (!enrollment.setup_token || new Date(enrollment.access_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This enrollment does not have an active setup link.' }, { status: 410 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fueldifferent.app'
    const setupUrl = `${appUrl}/signup?challenge=fuel42&token=${encodeURIComponent(enrollment.setup_token)}&email=${encodeURIComponent(enrollment.email)}`
    return NextResponse.json({ setupUrl })
  } catch (error: unknown) {
    console.error('Unable to retrieve FUEL 42 setup link:', error)
    const message = error instanceof Error ? error.message : 'Unable to retrieve FUEL 42 setup link.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
