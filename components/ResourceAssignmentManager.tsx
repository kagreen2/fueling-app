'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ResourceAssignment, ResourceMetadata } from '@/lib/resources/types'

interface AssignmentResponse {
  assignments?: ResourceAssignment[]
  articles?: ResourceMetadata[]
  athlete?: { id: string; profile?: { full_name?: string | null; email?: string | null } | null } | null
  error?: string
}

export default function ResourceAssignmentManager({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<AssignmentResponse>({})
  const [selectedSlug, setSelectedSlug] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/resources/assignments?athlete_id=${encodeURIComponent(athleteId)}`)
    const body = await response.json()
    setData(body)
    setLoading(false)
  }, [athleteId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const assignedSlugs = useMemo(() => new Set((data.assignments || []).map(assignment => assignment.article_slug)), [data.assignments])
  const availableArticles = (data.articles || []).filter(article => !assignedSlugs.has(article.slug))

  async function assign() {
    if (!selectedSlug) return
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/resources/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, article_slug: selectedSlug, coach_note: note, due_date: dueDate || null }),
    })
    const body = await response.json()
    if (!response.ok) setMessage(body.error || 'Unable to assign resource')
    else {
      setMessage('Resource assigned. The athlete will see it under Recommended for You.')
      setSelectedSlug('')
      setNote('')
      setDueDate('')
      load()
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this resource from Recommended for You?')) return
    const response = await fetch(`/api/resources/assignments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (response.ok) load()
    else setMessage((await response.json()).error || 'Unable to remove resource')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href={`/coach/athlete/${athleteId}`} className="text-sm text-slate-400 hover:text-white">← Back to athlete profile</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Coach-guided education</p>
        <h1 className="mt-2 text-3xl font-bold">Assign Resource</h1>
        <p className="mt-3 text-sm text-slate-400">Choose resources intentionally. The athlete will receive a neutral notification and see the assignment in Recommended for You.</p>
        {data.athlete?.profile?.full_name && <p className="mt-4 text-sm text-slate-300">Athlete: <span className="font-semibold text-white">{data.athlete.profile.full_name}</span></p>}

        {data.error && <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{data.error}</div>}
        {!data.error && (
          <>
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Add a resource</h2>
              <div className="mt-4 grid gap-4">
                <label className="text-sm text-slate-300">Resource
                  <select value={selectedSlug} onChange={event => setSelectedSlug(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
                    <option value="">Choose a resource…</option>
                    {availableArticles.map(article => <option key={article.slug} value={article.slug}>{article.title} · {article.category}{article.sensitivity === 'intentional_assignment' ? ' · intentional assignment' : ''}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300">Private coaching note <span className="text-slate-500">(optional)</span>
                  <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={1000} placeholder="Example: Start here before our next check-in." className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white placeholder:text-slate-600" />
                </label>
                <label className="text-sm text-slate-300">Suggested by <span className="text-slate-500">(optional)</span>
                  <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" />
                </label>
                <button onClick={assign} disabled={!selectedSlug || saving} className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Assigning…' : 'Assign resource'}</button>
              </div>
              {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active assignments</p><h2 className="mt-1 text-2xl font-semibold">Recommended for You</h2></div>
                {loading && <span className="text-xs text-slate-500">Loading…</span>}
              </div>
              <div className="mt-4 space-y-3">
                {(data.assignments || []).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-400">No resources assigned yet.</div> : (data.assignments || []).map(assignment => (
                  <div key={assignment.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">{assignment.article.category}</p><h3 className="mt-2 font-semibold text-white">{assignment.article.title}</h3><p className="mt-2 text-sm text-slate-400">{assignment.article.summary}</p></div>
                      <button onClick={() => remove(assignment.id)} className="text-xs text-slate-500 hover:text-red-300">Remove</button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span>{assignment.completed_at ? 'Completed' : assignment.opened_at ? 'Opened' : 'Not opened'}</span>{assignment.due_date && <span>Suggested by {new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString()}</span>}</div>
                    {assignment.coach_note && <p className="mt-3 border-l-2 border-emerald-400/50 pl-3 text-sm text-slate-300">{assignment.coach_note}</p>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
