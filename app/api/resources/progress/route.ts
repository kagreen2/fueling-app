import { NextResponse } from 'next/server'
import { getResourceArticle, toResourceMetadata } from '@/lib/resources/catalog'
import { getAthleteForUser, getAuthenticatedContext } from '@/lib/resources/access'

export async function GET() {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const athlete = await getAthleteForUser(context.admin, context.profile.id)
  if (!athlete) return NextResponse.json({ assignments: [] })

  const { data, error } = await context.admin
    .from('resource_assignments')
    .select('id, article_slug, athlete_id, assigned_by, coach_note, due_date, assigned_at, opened_at, completed_at, removed_at')
    .eq('athlete_id', athlete.id)
    .is('removed_at', null)
    .order('assigned_at', { ascending: false })
  if (error) {
    console.error('Unable to load Resource Library progress:', error)
    return NextResponse.json({ error: 'Resource assignments are not available yet.' }, { status: 500 })
  }

  const assignments = (data || [])
    .map(assignment => {
      const article = getResourceArticle(assignment.article_slug)
      return article ? { ...assignment, article: toResourceMetadata(article) } : null
    })
    .filter(Boolean)

  return NextResponse.json({ assignments })
}

export async function POST(request: Request) {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const athlete = await getAthleteForUser(context.admin, context.profile.id)
  if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 })

  let body: { article_slug?: unknown; event?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const articleSlug = typeof body.article_slug === 'string' ? body.article_slug : ''
  const event = body.event === 'completed' ? 'completed' : body.event === 'opened' ? 'opened' : null
  if (!articleSlug || !event || !getResourceArticle(articleSlug)) {
    return NextResponse.json({ error: 'Invalid resource progress event' }, { status: 400 })
  }

  const { data: assignment } = await context.admin
    .from('resource_assignments')
    .select('id, opened_at, completed_at')
    .eq('athlete_id', athlete.id)
    .eq('article_slug', articleSlug)
    .is('removed_at', null)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ ok: true, assigned: false })

  const updates = event === 'completed'
    ? { opened_at: assignment.opened_at || new Date().toISOString(), completed_at: new Date().toISOString() }
    : { opened_at: assignment.opened_at || new Date().toISOString() }

  const { error } = await context.admin
    .from('resource_assignments')
    .update(updates)
    .eq('id', assignment.id)
    .eq('athlete_id', athlete.id)
  if (error) return NextResponse.json({ error: 'Unable to save resource progress.' }, { status: 500 })
  return NextResponse.json({ ok: true, assigned: true })
}
