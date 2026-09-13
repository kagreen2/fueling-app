'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ResourceArticle, ResourceAssignment } from '@/lib/resources/types'

export default function ResourceArticleClient({ article, assignment }: { article: ResourceArticle; assignment: ResourceAssignment | null }) {
  const [completed, setCompleted] = useState(Boolean(assignment?.completed_at))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!assignment) return
    fetch('/api/resources/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_slug: article.slug, event: 'opened' }),
    }).catch(() => undefined)
  }, [article.slug, assignment])

  async function markComplete() {
    setSaving(true)
    try {
      const response = await fetch('/api/resources/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_slug: article.slug, event: 'completed' }),
      })
      if (response.ok) {
        setCompleted(true)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/athlete/resources" className="text-sm text-slate-400 hover:text-white">← Back to Resource Library</Link>
        <article className="mt-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
            <span>{article.category}</span>
            <span className="text-slate-600">·</span>
            <span>{article.readTimeMinutes} min read</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{article.summary}</p>

          {assignment && (
            <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Recommended for You</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">Your coaching team added this resource for you.</p>
                  {assignment.coach_note && <p className="mt-3 border-l-2 border-emerald-400/70 pl-3 text-sm leading-6 text-emerald-100">{assignment.coach_note}</p>}
                  {assignment.due_date && <p className="mt-3 text-xs text-slate-400">Suggested by {new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString()}</p>}
                </div>
                <button onClick={markComplete} disabled={completed || saving} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-300 disabled:cursor-default disabled:opacity-70">
                  {completed ? 'Marked complete' : saving ? 'Saving…' : 'Mark as read'}
                </button>
              </div>
              {saved && <p className="mt-3 text-xs text-emerald-300">Your progress was saved.</p>}
            </div>
          )}

          <div className="mt-10 border-t border-slate-800 pt-8 text-[15px] leading-7 text-slate-300 [&_h1]:sr-only [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-slate-800 [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-emerald-200 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-white [&_a]:text-emerald-300 [&_a]:underline [&_table]:mt-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-900 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:text-white [&_td]:border [&_td]:border-slate-700 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </main>
  )
}
