'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AthleteOption = {
  id: string
  profileId: string
  name: string
  teamId: string
  teamName: string
}

type TeamOption = { id: string; name: string }

type Recipient = {
  athlete_id: string
  recipient_name: string | null
}

type DeliverySummary = { sent: number; failed: number }

type ScheduledMessage = {
  id: string
  message: string
  audience_type: 'athletes' | 'team'
  audience_label: string | null
  recurrence: 'once' | 'weekly'
  timezone: string
  scheduled_for: string
  next_send_at: string
  status: 'scheduled' | 'paused' | 'completed' | 'canceled'
  created_at: string
  coach_name?: string
  recipients: Recipient[]
  delivery_summary: DeliverySummary
}

type FormTarget = 'athletes' | 'team'
type Notice = { type: 'success' | 'error'; text: string } | null

const STATUS_STYLE: Record<ScheduledMessage['status'], string> = {
  scheduled: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  paused: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  completed: 'border-slate-600 bg-slate-700/60 text-slate-300',
  canceled: 'border-red-400/25 bg-red-500/10 text-red-200',
}

function centralInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: string) => parts.find(part => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}

function centralInputToIso(value: string) {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null

  // Interpret the wall-clock value as America/Chicago, including daylight-saving time.
  const initialUtc = Date.UTC(year, month - 1, day, hour, minute)
  const getOffset = (timestamp: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(timestamp))
    const part = (type: string) => Number(parts.find(item => item.type === type)?.value || 0)
    return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')) - timestamp
  }
  const firstOffset = getOffset(initialUtc)
  const adjustedUtc = initialUtc - firstOffset
  const finalOffset = getOffset(adjustedUtc)
  return new Date(initialUtc - finalOffset).toISOString()
}

function formatCentral(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(date))
}

function defaultScheduleInput() {
  return centralInputValue(new Date(Date.now() + 15 * 60 * 1000))
}

export default function ScheduledMessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([])
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [target, setTarget] = useState<FormTarget>('athletes')
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [athleteSearch, setAthleteSearch] = useState('')
  const [message, setMessage] = useState('')
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleInput)
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('once')
  const [notice, setNotice] = useState<Notice>(null)

  const visibleAthletes = useMemo(() => {
    const query = athleteSearch.trim().toLowerCase()
    if (!query) return athletes
    return athletes.filter(athlete =>
      athlete.name.toLowerCase().includes(query) || athlete.teamName.toLowerCase().includes(query)
    )
  }, [athleteSearch, athletes])

  const selectedNames = useMemo(() => {
    const byId = new Map(athletes.map(athlete => [athlete.id, athlete.name]))
    return selectedAthleteIds.map(id => byId.get(id)).filter(Boolean).join(', ')
  }, [athletes, selectedAthleteIds])

  async function loadData() {
    setLoading(true)
    try {
      const response = await fetch('/api/coach/scheduled-messages', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load scheduled messages.')
      setSchedules(result.schedules || [])
      setAthletes(result.athletes || [])
      setTeams(result.teams || [])
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load scheduled messages.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetComposer() {
    setEditingId(null)
    setTarget('athletes')
    setSelectedAthleteIds([])
    setSelectedTeamId('')
    setAthleteSearch('')
    setMessage('')
    setScheduledFor(defaultScheduleInput())
    setRecurrence('once')
    setNotice(null)
  }

  function toggleAthlete(athleteId: string) {
    setSelectedAthleteIds(current => current.includes(athleteId)
      ? current.filter(id => id !== athleteId)
      : [...current, athleteId]
    )
  }

  function selectVisibleAthletes() {
    setSelectedAthleteIds(current => [...new Set([...current, ...visibleAthletes.map(athlete => athlete.id)])])
  }

  async function submitSchedule() {
    const iso = centralInputToIso(scheduledFor)
    if (!iso) {
      setNotice({ type: 'error', text: 'Choose a valid Central Time send date and time.' })
      return
    }
    if (!message.trim()) {
      setNotice({ type: 'error', text: 'Write a message before scheduling it.' })
      return
    }
    if (!editingId && target === 'athletes' && selectedAthleteIds.length === 0) {
      setNotice({ type: 'error', text: 'Select at least one athlete.' })
      return
    }
    if (!editingId && target === 'team' && !selectedTeamId) {
      setNotice({ type: 'error', text: 'Select a team.' })
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      const payload = editingId
        ? { id: editingId, action: 'edit', message: message.trim(), recurrence, scheduledFor: iso }
        : {
          message: message.trim(),
          audienceType: target,
          athleteIds: target === 'athletes' ? selectedAthleteIds : [],
          teamId: target === 'team' ? selectedTeamId : undefined,
          recurrence,
          scheduledFor: iso,
        }
      const response = await fetch('/api/coach/scheduled-messages', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save scheduled message.')
      setNotice({ type: 'success', text: editingId ? 'Scheduled message updated.' : 'Message scheduled successfully.' })
      setShowComposer(false)
      resetComposer()
      await loadData()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save scheduled message.' })
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(schedule: ScheduledMessage) {
    setEditingId(schedule.id)
    setMessage(schedule.message)
    setRecurrence(schedule.recurrence)
    setScheduledFor(centralInputValue(new Date(schedule.next_send_at)))
    setTarget(schedule.audience_type)
    setSelectedAthleteIds(schedule.recipients.map(recipient => recipient.athlete_id))
    setShowComposer(true)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function changeScheduleState(id: string, action: 'pause' | 'resume' | 'cancel') {
    const label = action === 'cancel' ? 'cancel' : action
    if (action === 'cancel' && !window.confirm('Cancel this scheduled message? It will not be sent.')) return
    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch('/api/coach/scheduled-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Unable to ${label} this message.`)
      setNotice({ type: 'success', text: `Scheduled message ${action === 'cancel' ? 'canceled' : `${action}d`}.` })
      await loadData()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : `Unable to ${label} this message.` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => router.push('/coach/dashboard')}
              className="text-xl text-slate-400 transition-colors hover:text-white"
              aria-label="Back to coach dashboard"
            >
              ←
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">Coach Tools</p>
              <h1 className="truncate text-xl font-bold">Scheduled Messages</h1>
              <p className="mt-0.5 text-xs text-slate-400">Schedule once or weekly · All times are Central Time</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetComposer()
              setShowComposer(true)
            }}
            className="shrink-0 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 active:scale-[0.98]"
          >
            + Schedule Message
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-20">
        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                : 'border-red-400/25 bg-red-500/10 text-red-100'
            }`}
          >
            {notice.text}
          </div>
        )}

        {showComposer && (
          <section className="rounded-2xl border border-purple-500/35 bg-slate-800/70 p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">{editingId ? 'Edit Upcoming Message' : 'New Scheduled Message'}</p>
                <h2 className="mt-1 text-xl font-bold">{editingId ? 'Update this send' : 'Write it now. Send it later.'}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">Scheduled messages appear in the athlete’s chat when delivered. Athletes with notifications enabled receive the usual neutral alert without message text.</p>
              </div>
              <button
                onClick={() => {
                  resetComposer()
                  setShowComposer(false)
                }}
                className="rounded-lg px-2 py-1 text-lg text-slate-500 transition-colors hover:text-white"
                aria-label="Close scheduler"
              >
                ×
              </button>
            </div>

            {!editingId ? (
              <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900/45 p-4">
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setTarget('athletes')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${target === 'athletes' ? 'border-purple-500 bg-purple-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    Select Athlete(s)
                  </button>
                  <button
                    onClick={() => setTarget('team')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${target === 'team' ? 'border-purple-500 bg-purple-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    Entire Team
                  </button>
                </div>

                {target === 'athletes' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-300">Choose one or more athletes.</p>
                      <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-200">{selectedAthleteIds.length} selected</span>
                    </div>
                    <input
                      type="search"
                      value={athleteSearch}
                      onChange={event => setAthleteSearch(event.target.value)}
                      placeholder="Search athletes or teams..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <button onClick={selectVisibleAthletes} type="button" className="text-purple-300 hover:text-purple-100">Select visible ({visibleAthletes.length})</button>
                      <button onClick={() => setSelectedAthleteIds([])} type="button" className="text-slate-400 hover:text-white">Clear selection</button>
                    </div>
                    <div className="max-h-60 divide-y divide-slate-700 overflow-y-auto rounded-lg border border-slate-700">
                      {visibleAthletes.map(athlete => {
                        const selected = selectedAthleteIds.includes(athlete.id)
                        return (
                          <label key={athlete.id} className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${selected ? 'bg-purple-500/15' : 'bg-slate-800/40 hover:bg-slate-700/50'}`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleAthlete(athlete.id)} className="h-4 w-4 accent-purple-500" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-white">{athlete.name}</span>
                              <span className="block truncate text-xs text-slate-500">{athlete.teamName}</span>
                            </span>
                          </label>
                        )
                      })}
                      {visibleAthletes.length === 0 && <p className="px-3 py-5 text-center text-sm text-slate-500">No athletes match that search.</p>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Team</label>
                    <select value={selectedTeamId} onChange={event => setSelectedTeamId(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none">
                      <option value="">Select a team...</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-500">The athletes currently on this team are saved as this message’s recipients when you schedule it.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900/45 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recipients stay the same while editing</p>
                <p className="mt-1 text-sm font-medium text-white">{selectedNames || 'Selected athletes'}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Message</label>
                <textarea
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Write the message athletes should receive..."
                  className="w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-slate-500">{message.length}/2000</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Send date &amp; time <span className="text-purple-300">(Central Time)</span></label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={event => setScheduledFor(event.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Repeat</label>
                  <select value={recurrence} onChange={event => setRecurrence(event.target.value as 'once' | 'weekly')} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none">
                    <option value="once">Send once</option>
                    <option value="weekly">Repeat weekly</option>
                  </select>
                </div>
              </div>
              <button
                onClick={submitSchedule}
                disabled={saving}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : recurrence === 'weekly' ? 'Schedule Weekly Message' : 'Schedule Message'}
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Message Queue</p>
              <h2 className="mt-1 text-lg font-bold">Upcoming &amp; recent messages</h2>
            </div>
            <button onClick={loadData} className="text-sm font-semibold text-purple-300 hover:text-purple-100">Refresh</button>
          </div>

          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/35 px-6 py-12 text-center">
              <p className="text-lg font-bold text-white">Nothing scheduled yet.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Set up a weekly office-hours reminder, a personalized check-in, or a one-time message to arrive when it will help most.</p>
              <button onClick={() => setShowComposer(true)} className="mt-5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700">Schedule your first message</button>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => {
                const editable = schedule.status === 'scheduled' || schedule.status === 'paused'
                const recipientLabel = schedule.audience_type === 'team'
                  ? `${schedule.audience_label || 'Team'} · ${schedule.recipients.length} athlete${schedule.recipients.length === 1 ? '' : 's'}`
                  : `${schedule.recipients.length} selected athlete${schedule.recipients.length === 1 ? '' : 's'}`
                return (
                  <article key={schedule.id} className="rounded-2xl border border-slate-700 bg-slate-800/55 p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[schedule.status]}`}>{schedule.status}</span>
                          <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">{schedule.recurrence === 'weekly' ? '↻ Weekly' : 'One-time'}</span>
                          {schedule.coach_name && <span className="text-xs text-slate-500">Created by {schedule.coach_name}</span>}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{schedule.message}</p>
                        <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-400 sm:grid-cols-2">
                          <p><span className="font-semibold text-slate-300">{schedule.status === 'completed' ? 'Last sent:' : 'Next send:'}</span> {formatCentral(schedule.status === 'completed' ? schedule.scheduled_for : schedule.next_send_at)}</p>
                          <p><span className="font-semibold text-slate-300">Recipients:</span> {recipientLabel}</p>
                          {(schedule.delivery_summary.sent > 0 || schedule.delivery_summary.failed > 0) && <p className="sm:col-span-2"><span className="font-semibold text-slate-300">Delivery history:</span> {schedule.delivery_summary.sent} sent{schedule.delivery_summary.failed ? ` · ${schedule.delivery_summary.failed} needs retry` : ''}</p>}
                        </div>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                          <button onClick={() => beginEdit(schedule)} disabled={saving} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-purple-400 hover:text-white disabled:opacity-50">Edit</button>
                          {schedule.status === 'scheduled' ? (
                            <button onClick={() => changeScheduleState(schedule.id, 'pause')} disabled={saving} className="rounded-lg border border-amber-400/30 px-3 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/10 disabled:opacity-50">Pause</button>
                          ) : (
                            <button onClick={() => changeScheduleState(schedule.id, 'resume')} disabled={saving} className="rounded-lg border border-emerald-400/30 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/10 disabled:opacity-50">Resume</button>
                          )}
                          <button onClick={() => changeScheduleState(schedule.id, 'cancel')} disabled={saving} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50">Cancel</button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
