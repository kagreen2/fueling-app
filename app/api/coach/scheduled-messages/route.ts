import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js'

const STAFF_ROLES = new Set(['coach', 'admin', 'super_admin'])
const MAX_RECIPIENTS = 250

type Actor = {
  userId: string
  role: string
  isAdmin: boolean
  service: SupabaseClient
}

type AthleteOption = {
  id: string
  profileId: string
  name: string
  teamId: string
  teamName: string
}

type TeamOption = { id: string; name: string }

async function getActor(): Promise<Actor | NextResponse> {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: 'Coach access required' }, { status: 403 })
  }

  return {
    userId: user.id,
    role: profile.role,
    isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
    service,
  }
}

function isResponse(value: Actor | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

async function getCoachScope(actor: Actor): Promise<{ athletes: AthleteOption[]; teams: TeamOption[] }> {
  let teamsQuery = actor.service
    .from('teams')
    .select('id, name, coach_id')
    .order('name')

  if (!actor.isAdmin) teamsQuery = teamsQuery.eq('coach_id', actor.userId)

  const { data: teamRows } = await teamsQuery
  const teams = (teamRows || []).map(team => ({ id: team.id, name: team.name }))
  const teamIds = teams.map(team => team.id)
  const athletesById = new Map<string, AthleteOption>()

  if (teamIds.length > 0) {
    const { data: members } = await actor.service
      .from('team_members')
      .select(`
        athlete_id,
        team_id,
        athlete:athletes(
          id,
          profile_id,
          profile:profiles!athletes_profile_id_fkey(full_name)
        )
      `)
      .in('team_id', teamIds)

    for (const member of members || []) {
      const athlete = member.athlete as unknown as {
        id: string
        profile_id: string
        profile: { full_name: string | null } | null
      } | null
      if (!athlete?.id || !athlete.profile_id) continue
      const team = teams.find(item => item.id === member.team_id)
      athletesById.set(athlete.id, {
        id: athlete.id,
        profileId: athlete.profile_id,
        name: athlete.profile?.full_name || 'Unnamed athlete',
        teamId: member.team_id,
        teamName: team?.name || 'Team',
      })
    }
  }

  let assignmentsQuery = actor.service
    .from('athlete_coach_assignments')
    .select(`
      athlete_id,
      athlete:athletes(
        id,
        profile_id,
        profile:profiles!athletes_profile_id_fkey(full_name)
      )
    `)

  if (!actor.isAdmin) assignmentsQuery = assignmentsQuery.eq('coach_id', actor.userId)

  const { data: directAssignments } = await assignmentsQuery
  for (const assignment of directAssignments || []) {
    const athlete = assignment.athlete as unknown as {
      id: string
      profile_id: string
      profile: { full_name: string | null } | null
    } | null
    if (!athlete?.id || !athlete.profile_id || athletesById.has(athlete.id)) continue
    athletesById.set(athlete.id, {
      id: athlete.id,
      profileId: athlete.profile_id,
      name: athlete.profile?.full_name || 'Unnamed athlete',
      teamId: 'direct_assignment',
      teamName: 'Direct Assignment',
    })
  }

  return {
    teams,
    athletes: [...athletesById.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function parseScheduledFor(value: unknown) {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function canManageSchedule(actor: Actor, coachId: string) {
  return actor.isAdmin || actor.userId === coachId
}

export async function GET() {
  const actor = await getActor()
  if (isResponse(actor)) return actor

  try {
    const scope = await getCoachScope(actor)
    let schedulesQuery = actor.service
      .from('scheduled_coach_messages')
      .select('*')
      .order('next_send_at', { ascending: true })
      .limit(200)

    if (!actor.isAdmin) schedulesQuery = schedulesQuery.eq('coach_id', actor.userId)
    const { data: schedules, error: schedulesError } = await schedulesQuery
    if (schedulesError) throw schedulesError

    const scheduleIds = (schedules || []).map(schedule => schedule.id)
    const [recipientsResult, deliveriesResult, coachProfilesResult] = await Promise.all([
      scheduleIds.length > 0
        ? actor.service
          .from('scheduled_coach_message_recipients')
          .select('scheduled_message_id, athlete_id, recipient_profile_id, recipient_name')
          .in('scheduled_message_id', scheduleIds)
        : Promise.resolve({ data: [], error: null }),
      scheduleIds.length > 0
        ? actor.service
          .from('scheduled_coach_message_deliveries')
          .select('scheduled_message_id, status, sent_at, last_error')
          .in('scheduled_message_id', scheduleIds)
          .order('created_at', { ascending: false })
          .limit(800)
        : Promise.resolve({ data: [], error: null }),
      actor.isAdmin && schedules && schedules.length > 0
        ? actor.service
          .from('profiles')
          .select('id, full_name')
          .in('id', [...new Set(schedules.map(schedule => schedule.coach_id))])
        : Promise.resolve({ data: [], error: null }),
    ])

    if (recipientsResult.error) throw recipientsResult.error
    if (deliveriesResult.error) throw deliveriesResult.error
    if (coachProfilesResult.error) throw coachProfilesResult.error

    const recipientsBySchedule = new Map<string, typeof recipientsResult.data>()
    for (const recipient of recipientsResult.data || []) {
      const current = recipientsBySchedule.get(recipient.scheduled_message_id) || []
      current.push(recipient)
      recipientsBySchedule.set(recipient.scheduled_message_id, current)
    }
    const deliveriesBySchedule = new Map<string, typeof deliveriesResult.data>()
    for (const delivery of deliveriesResult.data || []) {
      const current = deliveriesBySchedule.get(delivery.scheduled_message_id) || []
      current.push(delivery)
      deliveriesBySchedule.set(delivery.scheduled_message_id, current)
    }
    const coachNames = new Map((coachProfilesResult.data || []).map(profile => [profile.id, profile.full_name]))

    const formattedSchedules = (schedules || []).map(schedule => ({
      ...schedule,
      coach_name: actor.isAdmin ? coachNames.get(schedule.coach_id) || 'Coach' : undefined,
      recipients: recipientsBySchedule.get(schedule.id) || [],
      delivery_summary: {
        sent: (deliveriesBySchedule.get(schedule.id) || []).filter(delivery => delivery.status === 'sent').length,
        failed: (deliveriesBySchedule.get(schedule.id) || []).filter(delivery => delivery.status === 'failed').length,
      },
    }))

    return NextResponse.json({ schedules: formattedSchedules, athletes: scope.athletes, teams: scope.teams })
  } catch (error) {
    console.error('[SCHEDULED MESSAGES] Load failed', error)
    return NextResponse.json({ error: 'Unable to load scheduled messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const actor = await getActor()
  if (isResponse(actor)) return actor

  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const recurrence = body.recurrence === 'weekly' ? 'weekly' : 'once'
    const audienceType = body.audienceType === 'team' ? 'team' : 'athletes'
    const scheduledFor = parseScheduledFor(body.scheduledFor)

    if (!message || message.length > 2000) {
      return NextResponse.json({ error: 'Write a message between 1 and 2,000 characters.' }, { status: 400 })
    }
    if (!scheduledFor || scheduledFor.getTime() < Date.now() + 60_000) {
      return NextResponse.json({ error: 'Choose a send time at least one minute in the future.' }, { status: 400 })
    }

    const scope = await getCoachScope(actor)
    const submittedAthleteIds: string[] = Array.isArray(body.athleteIds)
      ? body.athleteIds.filter((id: unknown): id is string => typeof id === 'string')
      : []
    let recipientIds: string[] = [...new Set(submittedAthleteIds)]
    let audienceLabel = typeof body.audienceLabel === 'string' ? body.audienceLabel.trim().slice(0, 120) : null

    if (audienceType === 'team') {
      const teamId = typeof body.teamId === 'string' ? body.teamId : ''
      const team = scope.teams.find(item => item.id === teamId)
      if (!team) return NextResponse.json({ error: 'Choose a team you are allowed to message.' }, { status: 400 })
      recipientIds = scope.athletes.filter(athlete => athlete.teamId === teamId).map(athlete => athlete.id)
      audienceLabel = team.name
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one athlete.' }, { status: 400 })
    }
    if (recipientIds.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Select no more than ${MAX_RECIPIENTS} athletes at once.` }, { status: 400 })
    }

    const scopeById = new Map(scope.athletes.map(athlete => [athlete.id, athlete]))
    const recipients = recipientIds.map(id => scopeById.get(id)).filter(Boolean) as AthleteOption[]
    if (recipients.length !== recipientIds.length) {
      return NextResponse.json({ error: 'One or more selected athletes are outside your coaching roster.' }, { status: 403 })
    }

    const { data: schedule, error: scheduleError } = await actor.service
      .from('scheduled_coach_messages')
      .insert({
        coach_id: actor.userId,
        message,
        audience_type: audienceType,
        audience_label: audienceLabel,
        recurrence,
        timezone: 'America/Chicago',
        scheduled_for: scheduledFor.toISOString(),
        next_send_at: scheduledFor.toISOString(),
        status: 'scheduled',
      })
      .select('*')
      .single()

    if (scheduleError || !schedule) throw scheduleError || new Error('Schedule was not created.')

    const { error: recipientsError } = await actor.service
      .from('scheduled_coach_message_recipients')
      .insert(recipients.map(recipient => ({
        scheduled_message_id: schedule.id,
        athlete_id: recipient.id,
        recipient_profile_id: recipient.profileId,
        recipient_name: recipient.name,
      })))

    if (recipientsError) {
      await actor.service.from('scheduled_coach_messages').delete().eq('id', schedule.id)
      throw recipientsError
    }

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error('[SCHEDULED MESSAGES] Create failed', error)
    return NextResponse.json({ error: 'Unable to schedule that message' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await getActor()
  if (isResponse(actor)) return actor

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Schedule ID is required.' }, { status: 400 })

    const { data: existing, error: existingError } = await actor.service
      .from('scheduled_coach_messages')
      .select('*')
      .eq('id', id)
      .single()
    if (existingError || !existing) return NextResponse.json({ error: 'Scheduled message not found.' }, { status: 404 })
    if (!canManageSchedule(actor, existing.coach_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const action = body.action
    if (action === 'cancel') {
      if (existing.status === 'completed' || existing.status === 'canceled') {
        return NextResponse.json({ error: 'This message can no longer be canceled.' }, { status: 400 })
      }
      const { error } = await actor.service
        .from('scheduled_coach_messages')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'pause' || action === 'resume') {
      if (existing.status === 'completed' || existing.status === 'canceled') {
        return NextResponse.json({ error: 'This message can no longer be changed.' }, { status: 400 })
      }
      const isPause = action === 'pause'
      const { error } = await actor.service
        .from('scheduled_coach_messages')
        .update({
          status: isPause ? 'paused' : 'scheduled',
          paused_at: isPause ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'edit') {
      if (existing.status !== 'scheduled' && existing.status !== 'paused') {
        return NextResponse.json({ error: 'Only upcoming messages can be edited.' }, { status: 400 })
      }
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const recurrence = body.recurrence === 'weekly' ? 'weekly' : 'once'
      const scheduledFor = parseScheduledFor(body.scheduledFor)
      if (!message || message.length > 2000) {
        return NextResponse.json({ error: 'Write a message between 1 and 2,000 characters.' }, { status: 400 })
      }
      if (!scheduledFor || scheduledFor.getTime() < Date.now() + 60_000) {
        return NextResponse.json({ error: 'Choose a send time at least one minute in the future.' }, { status: 400 })
      }
      const { error } = await actor.service
        .from('scheduled_coach_messages')
        .update({
          message,
          recurrence,
          scheduled_for: scheduledFor.toISOString(),
          next_send_at: scheduledFor.toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    console.error('[SCHEDULED MESSAGES] Update failed', error)
    return NextResponse.json({ error: 'Unable to update scheduled message' }, { status: 500 })
  }
}
