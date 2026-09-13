import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export function getResourceAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAuthenticatedContext() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const admin = getResourceAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { user, profile, admin }
}

export async function getAthleteForUser(admin: SupabaseClient, profileId: string) {
  const { data } = await admin
    .from('athletes')
    .select('id, profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()
  return data
}

export async function canStaffAccessAthlete(
  admin: SupabaseClient,
  profile: { id: string; role: string },
  athleteId: string,
) {
  if (['admin', 'super_admin'].includes(profile.role)) return true
  if (profile.role !== 'coach') return false

  const { data: directAssignment } = await admin
    .from('athlete_coach_assignments')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('coach_id', profile.id)
    .limit(1)
    .maybeSingle()
  if (directAssignment) return true

  const { data: teams } = await admin
    .from('teams')
    .select('id')
    .eq('coach_id', profile.id)
  const teamIds = (teams || []).map(team => team.id)
  if (teamIds.length === 0) return false

  const { data: membership } = await admin
    .from('team_members')
    .select('id')
    .eq('athlete_id', athleteId)
    .in('team_id', teamIds)
    .limit(1)
    .maybeSingle()
  return Boolean(membership)
}
