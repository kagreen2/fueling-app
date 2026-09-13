export type ResourceSensitivity = 'general' | 'intentional_assignment'

export interface ResourceMetadata {
  slug: string
  title: string
  summary: string
  category: string
  audience: string
  sensitivity: ResourceSensitivity
  readTimeMinutes: number
  keywords: string[]
  reviewedAt: string
}

export interface ResourceArticle extends ResourceMetadata {
  content: string
}

export interface ResourceAssignment {
  id: string
  article_slug: string
  athlete_id: string
  assigned_by: string
  coach_note: string | null
  due_date: string | null
  assigned_at: string
  opened_at: string | null
  completed_at: string | null
  removed_at: string | null
  article: ResourceMetadata
}
