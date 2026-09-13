import { notFound } from 'next/navigation'
import ResourceArticleClient from '@/components/ResourceArticleClient'
import { getResourceArticle, toResourceMetadata } from '@/lib/resources/catalog'
import { getAthleteForUser, getAuthenticatedContext } from '@/lib/resources/access'
import type { ResourceAssignment } from '@/lib/resources/types'

export const dynamic = 'force-dynamic'

export default async function ResourceArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getResourceArticle(slug)
  if (!article) notFound()

  let assignment: ResourceAssignment | null = null
  const context = await getAuthenticatedContext()
  if (context) {
    const athlete = await getAthleteForUser(context.admin, context.profile.id)
    if (athlete) {
      const { data } = await context.admin
        .from('resource_assignments')
        .select('id, article_slug, athlete_id, assigned_by, coach_note, due_date, assigned_at, opened_at, completed_at, removed_at')
        .eq('athlete_id', athlete.id)
        .eq('article_slug', slug)
        .is('removed_at', null)
        .maybeSingle()
      if (data) {
        assignment = { ...data, article: toResourceMetadata(article) }
      }
    }
  }

  return <ResourceArticleClient article={article} assignment={assignment} />
}
