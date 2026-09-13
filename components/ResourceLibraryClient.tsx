'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ResourceAssignment, ResourceMetadata } from '@/lib/resources/types'

const CATEGORY_ORDER = [
  'Start Here',
  'Protein & Recovery',
  'Carbohydrates & Fiber',
  'Hydration & Caffeine',
  'Meal Planning',
  'Eating on the Go',
  'Performance Fueling',
  'Body Composition',
  'Women’s Health',
]

function isDone(assignment: ResourceAssignment) {
  return Boolean(assignment.completed_at)
}

export default function ResourceLibraryClient() {
  const [articles, setArticles] = useState<ResourceMetadata[]>([])
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All resources')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [catalogResponse, progressResponse] = await Promise.all([
          fetch('/api/resources/catalog'),
          fetch('/api/resources/progress'),
        ])
        const catalog = await catalogResponse.json()
        const progress = await progressResponse.json()
        if (!catalogResponse.ok) throw new Error(catalog.error || 'Unable to load resources')
        setArticles(catalog.articles || [])
        setAssignments(progress.assignments || [])
        if (!progressResponse.ok && progress.error) setError(progress.error)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load resources')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const assignmentBySlug = useMemo(
    () => new Map(assignments.map(assignment => [assignment.article_slug, assignment])),
    [assignments],
  )

  const assignedArticles = useMemo(() => assignments
    .map(assignment => assignment.article)
    .filter((article): article is ResourceMetadata => Boolean(article)), [assignments])

  const categories = useMemo(() => {
    const present = new Set(articles.map(article => article.category))
    return CATEGORY_ORDER.filter(item => present.has(item))
      .concat([...present].filter(item => !CATEGORY_ORDER.includes(item)))
  }, [articles])

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return articles.filter(article => {
      const categoryMatches = category === 'All resources' || article.category === category
      const queryMatches = !normalizedQuery || [article.title, article.summary, article.category, ...article.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
      return categoryMatches && queryMatches
    })
  }, [articles, category, query])

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><p className="text-slate-400">Loading your Resource Library…</p></main>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/athlete/dashboard" className="text-sm text-slate-400 hover:text-white">← Back to dashboard</Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Fuel Different education</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Resource Library</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Practical nutrition guidance for real training, real schedules, and progress that is bigger than one number.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-emerald-300">{assignments.filter(isDone).length}</span> of {assignments.length} assigned resource{assignments.length === 1 ? '' : 's'} completed
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div>
        )}

        {assignedArticles.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Coach-guided</p>
                <h2 className="mt-1 text-2xl font-semibold">Recommended for You</h2>
              </div>
              <p className="text-xs text-slate-500">Chosen intentionally by your coaching team</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {assignedArticles.map(article => {
                const assignment = assignmentBySlug.get(article.slug)
                return <ResourceCard key={article.slug} article={article} assignment={assignment} recommended />
              })}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Browse</p>
              <h2 className="mt-1 text-2xl font-semibold">Explore the library</h2>
            </div>
            <label className="w-full sm:w-72">
              <span className="sr-only">Search resources</span>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search protein, travel, recovery…" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400" />
            </label>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {['All resources', ...categories].map(item => (
              <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition-colors ${category === item ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                {item}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-400">No resources match that search yet.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map(article => <ResourceCard key={article.slug} article={article} assignment={assignmentBySlug.get(article.slug)} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ResourceCard({ article, assignment, recommended = false }: { article: ResourceMetadata; assignment?: ResourceAssignment; recommended?: boolean }) {
  const completed = Boolean(assignment?.completed_at)
  return (
    <Link href={`/athlete/resources/${article.slug}`} className="group flex min-h-52 flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition-colors hover:border-emerald-400/60 hover:bg-slate-900">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{article.category}</span>
          {recommended && <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Recommended</span>}
        </div>
        <h3 className="mt-4 text-lg font-semibold leading-6 text-white group-hover:text-emerald-300">{article.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">{article.summary}</p>
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>{article.readTimeMinutes} min read</span>
        {assignment && <span className={completed ? 'text-emerald-300' : 'text-amber-300'}>{completed ? 'Completed' : 'Assigned'}</span>}
      </div>
    </Link>
  )
}
