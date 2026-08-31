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
    .select('id, full_name, email, phone, package_key, package_name, amount_cents, payment_status, status, access_expires_at, setup_email_sent_at, setup_token_used_at, onboarding_completed_at, coach_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Unable to load FUEL 42 enrollments:', error)
    return NextResponse.json({ error: 'Unable to load FUEL 42 enrollments. Confirm that FUEL42-SETUP.sql has been run in Supabase.' }, { status: 500 })
  }

  return NextResponse.json({ enrollments: data || [] })
}
