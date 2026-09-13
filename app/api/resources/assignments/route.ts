import { NextResponse } from 'next/server'
import { getResourceArticle, getResourceArticles, toResourceMetadata } from '@/lib/resources/catalog'
import { canStaffAccessAthlete, getAthleteForUser, getAuthenticatedContext } from '@/lib/resources/access'
import { sendPushToUser } from '@/lib/notifications/send-push'

function isStaff(role: string) {
  return role === 'admin' || role === 'super_admin' || role === 'coach'
}

function cleanNote(value: unknown) {
  if (typeof value !== 'string') return null
  const note = value.trim()
  return note ? note.slice(0, 1000) : null
}

function cleanDueDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

export async function GET(request: Request) {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(request.url)
  const requestedAthleteId = url.searchParams.get('athlete_id')
  const ownAthlete = await getAthleteForUser(context.admin, context.profile.id)
  const athleteId = isStaff(context.profile.role) && requestedAthleteId ? requestedAthleteId : ownAthlete?.id

  if (!athleteId) return NextResponse.json({ assignments: [], articles: [] })
  if (isStaff(context.profile.role) && !(await canStaffAccessAthlete(context.admin, context.profile, athleteId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  if (!isStaff(context.profile.role) && athleteId !== ownAthlete?.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: assignments, error } = await context.admin
    .from('resource_assignments')
    .select('id, article_slug, athlete_id, assigned_by, coach_note, due_date, assigned_at, opened_at, completed_at, removed_at')
    .eq('athlete_id', athleteId)
    .is('removed_at', null)
    .order('assigned_at', { ascending: false })

  if (error) {
    console.error('Unable to load Resource Library assignments:', error)
    return NextResponse.json({ error: 'Resource assignments are not available yet. Run sql/RESOURCE-LIBRARY-SETUP.sql in Supabase.' }, { status: 500 })
  }

  const articleMap = new Map(getResourceArticles().map(article => [article.slug, toResourceMetadata(article)]))
  const shapedAssignments = (assignments || [])
    .map(assignment => ({ ...assignment, article: articleMap.get(assignment.article_slug) || null }))
    .filter(assignment => assignment.article)

  const response: Record<string, unknown> = { assignments: shapedAssignments }
  if (isStaff(context.profile.role)) {
    const { data: athlete } = await context.admin
      .from('athletes')
      .select('id, profile:profiles(full_name, email)')
      .eq('id', athleteId)
      .maybeSingle()
    response.athlete = athlete || null
    response.articles = getResourceArticles().map(toResourceMetadata)
  }

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isStaff(context.profile.role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  let body: { athlete_id?: unknown; article_slug?: unknown; coach_note?: unknown; due_date?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : ''
  const articleSlug = typeof body.article_slug === 'string' ? body.article_slug : ''
  const article = articleSlug ? getResourceArticle(articleSlug) : null
  if (!athleteId || !article) return NextResponse.json({ error: 'Choose a valid athlete and resource.' }, { status: 400 })
  if (!(await canStaffAccessAthlete(context.admin, context.profile, athleteId))) {
    return NextResponse.json({ error: 'Not authorized for this athlete' }, { status: 403 })
  }

  const coachNote = cleanNote(body.coach_note)
  const dueDate = cleanDueDate(body.due_date)
  const { data: existing } = await context.admin
    .from('resource_assignments')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('article_slug', articleSlug)
    .is('removed_at', null)
    .maybeSingle()

  const assignment = existing
    ? await context.admin
      .from('resource_assignments')
      .update({ coach_note: coachNote, due_date: dueDate })
      .eq('id', existing.id)
      .select('id, article_slug, athlete_id, assigned_by, coach_note, due_date, assigned_at, opened_at, completed_at, removed_at')
      .single()
    : await context.admin
      .from('resource_assignments')
      .insert({ article_slug: articleSlug, athlete_id: athleteId, assigned_by: context.profile.id, coach_note: coachNote, due_date: dueDate })
      .select('id, article_slug, athlete_id, assigned_by, coach_note, due_date, assigned_at, opened_at, completed_at, removed_at')
      .single()

  if (assignment.error || !assignment.data) {
    console.error('Unable to save Resource Library assignment:', assignment.error)
    return NextResponse.json({ error: 'Unable to save the resource assignment.' }, { status: 500 })
  }

  const { data: athlete } = await context.admin
    .from('athletes')
    .select('profile_id')
    .eq('id', athleteId)
    .maybeSingle()
  if (athlete?.profile_id && !existing) {
    try {
      await sendPushToUser(athlete.profile_id, {
        title: 'New Fuel Different resource',
        body: 'A new resource was added to Recommended for You.',
        tag: 'resource-assignment',
        url: `/athlete/resources/${article.slug}`,
      })
    } catch (error) {
      console.warn('Resource assignment saved but push notification failed:', error)
    }
  }

  return NextResponse.json({ assignment: { ...assignment.data, article: toResourceMetadata(article) } })
}

export async function DELETE(request: Request) {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isStaff(context.profile.role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Assignment id is required' }, { status: 400 })

  const { data: assignment } = await context.admin
    .from('resource_assignments')
    .select('id, athlete_id')
    .eq('id', id)
    .maybeSingle()
  if (!assignment || !(await canStaffAccessAthlete(context.admin, context.profile, assignment.athlete_id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await context.admin
    .from('resource_assignments')
    .update({ removed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to remove assignment.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
