import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function requireStaff() {
  const auth = await createServerClient()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin', 'coach'].includes(profile.role)) return { error: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) }
  return { user, admin: getAdminClient() }
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireStaff()
    if ('error' in context) return context.error
    const athleteId = req.nextUrl.searchParams.get('athleteId')
    if (!athleteId) return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
    const { data: scans, error } = await context.admin
      .from('biometric_scans')
      .select('id, scan_date, weight_lbs, percent_body_fat, skeletal_muscle_mass_lbs, source')
      .eq('athlete_id', athleteId)
      .order('scan_date', { ascending: true })
    if (error) throw error
    return NextResponse.json({ scans: scans || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load scans.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireStaff()
    if ('error' in context) return context.error
    const { athleteId, startingScanId, finalScanId } = await req.json()
    if (!athleteId || !startingScanId || !finalScanId) return NextResponse.json({ error: 'Starting and final scan selections are required.' }, { status: 400 })
    const { data: challengeProfile } = await context.admin
      .from('fuel42_challenge_profiles')
      .select('body_comp_consent')
      .eq('athlete_id', athleteId)
      .maybeSingle()
    if (!challengeProfile?.body_comp_consent) return NextResponse.json({ error: 'This participant has not consented to final body-composition points.' }, { status: 400 })
    const { data: scans, error: scanError } = await context.admin
      .from('biometric_scans')
      .select('id')
      .eq('athlete_id', athleteId)
      .in('id', [startingScanId, finalScanId])
    if (scanError || scans?.length !== 2) return NextResponse.json({ error: 'Selected scans must belong to this participant.' }, { status: 400 })
    const { error } = await context.admin
      .from('fuel42_challenge_profiles')
      .update({ starting_scan_id: startingScanId, final_scan_id: finalScanId, body_comp_verified_at: new Date().toISOString(), body_comp_verified_by: context.user.id, updated_at: new Date().toISOString() })
      .eq('athlete_id', athleteId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to verify FUEL 42 body-composition points.' }, { status: 500 })
  }
}
