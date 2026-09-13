import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { ResourceArticle, ResourceMetadata, ResourceSensitivity } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'resources')
let articleCache: ResourceArticle[] | null = null

function parseArticle(fileName: string): ResourceArticle {
  const source = fs.readFileSync(path.join(CONTENT_DIR, fileName), 'utf8')
  const parsed = matter(source)
  const data = parsed.data as Record<string, unknown>
  const keywords = Array.isArray(data.keywords)
    ? data.keywords.map(String)
    : String(data.keywords || '').split(',').map(value => value.trim()).filter(Boolean)

  return {
    slug: String(data.slug || fileName.replace(/\.md$/, '')),
    title: String(data.title || fileName.replace(/\.md$/, '')),
    summary: String(data.summary || ''),
    category: String(data.category || 'Start Here'),
    audience: String(data.audience || 'general'),
    sensitivity: (String(data.sensitivity || 'general') as ResourceSensitivity),
    readTimeMinutes: Number(data.readTimeMinutes || 5),
    keywords,
    reviewedAt: String(data.reviewedAt || ''),
    content: parsed.content.trim(),
  }
}

export function getResourceArticles(): ResourceArticle[] {
  if (!articleCache) {
    articleCache = fs.readdirSync(CONTENT_DIR)
      .filter(fileName => fileName.endsWith('.md'))
      .map(parseArticle)
      .sort((a, b) => a.title.localeCompare(b.title))
  }
  return articleCache
}

export function getResourceArticle(slug: string): ResourceArticle | null {
  return getResourceArticles().find(article => article.slug === slug) || null
}

export function toResourceMetadata(article: ResourceArticle): ResourceMetadata {
  const { content: _content, ...metadata } = article
  return metadata
}
