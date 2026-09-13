'use client'

// Design: Maintain Fuel Different’s dark, operational admin experience with clear setup actions, privacy-safe participant controls, and a staff-only direct-link fallback for in-person consultations.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Enrollment = {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  package_name: string
  amount_cents: number
  status: 'purchased' | 'setup_sent' | 'claimed' | 'onboarding_complete' | 'canceled' | 'refunded'
  access_expires_at: string
  setup_email_sent_at: string | null
  onboarding_completed_at: string | null
  athlete_id: string | null
  coach_id: string | null
  created_at: string
  leaderboard_display_name: string | null
  leaderboard_opt_in: boolean | null
  challenge_intake_completed: boolean
}

const STATUS_STYLES: Record<Enrollment['status'], string> = {
  purchased: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  setup_sent: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  claimed: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  onboarding_complete: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  canceled: 'bg-red-500/15 text-red-300 border-red-400/30',
  refunded: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
}

function formatStatus(status: Enrollment['status']) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
}

export default function Fuel42AdminPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmingEnrollment, setConfirmingEnrollment] = useState<Enrollment | null>(null)
  const [editingNameEnrollment, setEditingNameEnrollment] = useState<Enrollment | null>(null)
  const [leaderboardName, setLeaderboardName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadEnrollments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const response = await fetch('/api/challenges/fuel42/enrollments')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load FUEL 42 participants.')
    else setEnrollments(result.enrollments || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadEnrollments() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadEnrollments])

  async function sendSetup(enrollment: Enrollment) {
    setConfirmingEnrollment(null)
    setSendingId(enrollment.id)
    setError('')
    setNotice('')
    const response = await fetch('/api/challenges/fuel42/send-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId: enrollment.id }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to send the setup email.')
    else {
      setNotice(`Setup email sent to ${enrollment.email}.`)
      await loadEnrollments()
    }
    setSendingId(null)
  }

  async function copySetupLink(enrollment: Enrollment) {
    setCopyingId(enrollment.id)
    setCopiedId(null)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/challenges/fuel42/setup-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: enrollment.id }),
      })
      const result = await response.json()
      if (!response.ok || !result.setupUrl) throw new Error(result.error || 'Unable to retrieve the setup link.')
      await navigator.clipboard.writeText(result.setupUrl)
      setCopiedId(enrollment.id)
      setNotice(`Secure app setup link copied for ${enrollment.full_name || enrollment.email}. It must be used with the purchase email.`)
      window.setTimeout(() => setCopiedId(current => current === enrollment.id ? null : current), 2500)
    } catch (copyError: unknown) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy the setup link.')
    } finally {
      setCopyingId(null)
    }
  }

  function openLeaderboardNameEditor(enrollment: Enrollment) {
    setLeaderboardName(enrollment.leaderboard_display_name || '')
    setEditingNameEnrollment(enrollment)
    setError('')
    setNotice('')
  }

  async function saveLeaderboardName() {
    if (!editingNameEnrollment) return
    setSavingName(true)
    setError('')
    try {
      const response = await fetch('/api/challenges/fuel42/leaderboard-name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: editingNameEnrollment.id, displayName: leaderboardName }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update the leaderboard name.')
      setEnrollments(current => current.map(enrollment => enrollment.id === editingNameEnrollment.id
        ? { ...enrollment, leaderboard_display_name: result.displayName || null }
        : enrollment))
      setNotice(result.displayName
        ? `Leaderboard display name updated to ${result.displayName}.`
        : 'Leaderboard display name reset to the participant’s default first name and last initial.')
      setEditingNameEnrollment(null)
    } catch (nameError: unknown) {
      setError(nameError instanceof Error ? nameError.message : 'Unable to update the leaderboard name.')
    } finally {
      setSavingName(false)
    }
  }

  const awaitingSetup = enrollments.filter(enrollment => enrollment.status === 'purchased').length
  const inProgress = enrollments.filter(enrollment => ['setup_sent', 'claimed'].includes(enrollment.status)).length
  const complete = enrollments.filter(enrollment => enrollment.status === 'onboarding_complete').length

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">IRON FLAG FITNESS · FUEL DIFFERENT</p>
            <h1 className="mt-1 text-2xl font-bold text-white">FUEL 42 Participant Roster</h1>
          </div>
          <button onClick={() => router.push('/admin')} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500">
            Back to Admin
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-amber-400/20 bg-amber-500/5 p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Paid · Awaiting Setup</p><p className="mt-2 text-3xl font-bold">{awaitingSetup}</p></div>
          <div className="border border-purple-400/20 bg-purple-500/5 p-5"><p className="text-xs font-bold uppercase tracking-wider text-purple-300">Setup in Progress</p><p className="mt-2 text-3xl font-bold">{inProgress}</p></div>
          <div className="border border-emerald-400/20 bg-emerald-500/5 p-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Onboarding Complete</p><p className="mt-2 text-3xl font-bold">{complete}</p></div>
        </div>

        <div className="mt-8 border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-bold text-white">Consultation workflow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">After the participant completes their InBody consultation, select <strong className="text-slate-200">Send App Setup</strong>. If email is delayed, use <strong className="text-slate-200">Copy Setup Link</strong> and send or open the individual secure link while they are with you. The link routes the matching purchaser around the $25/month payment page and assigns them to you as their FUEL 42 coach.</p>
        </div>

        {notice && <p className="mt-5 border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
        {error && <p className="mt-5 border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

        <div className="mt-6 overflow-x-auto border border-slate-800">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-3">Participant</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Purchased</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading FUEL 42 participants…</td></tr> : enrollments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No FUEL 42 purchases have been received yet.</td></tr> : enrollments.map(enrollment => (
                <tr key={enrollment.id} className="bg-slate-950/40">
                  <td className="px-4 py-4"><p className="font-semibold text-white">{enrollment.full_name || 'Name not provided'}</p><p className="mt-1 text-slate-400">{enrollment.email}{enrollment.phone ? ` · ${enrollment.phone}` : ''}</p>{enrollment.challenge_intake_completed && <p className="mt-1 text-xs text-purple-200">Leaderboard: {enrollment.leaderboard_display_name || 'Default first name + last initial'}{enrollment.leaderboard_opt_in === false ? ' · Hidden by participant' : ''}</p>}</td>
                  <td className="px-4 py-4"><p className="text-slate-200">{enrollment.package_name}</p><p className="mt-1 text-emerald-300">${(enrollment.amount_cents / 100).toFixed(0)}</p></td>
                  <td className="px-4 py-4 text-slate-300">{new Date(enrollment.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4"><span className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[enrollment.status]}`}>{formatStatus(enrollment.status)}</span></td>
                  <td className="px-4 py-4">{enrollment.status === 'onboarding_complete' ? <div className="flex flex-col items-start gap-2"><span className="text-sm font-medium text-emerald-300">Complete</span>{enrollment.athlete_id && <button onClick={() => router.push(`/admin/fuel42/scans?athlete=${enrollment.athlete_id}`)} className="border border-emerald-400/40 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-400/10">Verify Final Scan</button>}{enrollment.challenge_intake_completed && <button onClick={() => openLeaderboardNameEditor(enrollment)} className="border border-purple-400/50 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-400/10">Edit Leaderboard Name</button>}</div> : <div className="flex flex-col items-start gap-2"><button onClick={() => setConfirmingEnrollment(enrollment)} disabled={sendingId === enrollment.id} className="bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-60">{sendingId === enrollment.id ? 'Sending…' : enrollment.setup_email_sent_at ? 'Resend App Setup' : 'Send App Setup'}</button><button onClick={() => copySetupLink(enrollment)} disabled={copyingId === enrollment.id} className="border border-purple-400/50 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-400/10 disabled:opacity-60">{copyingId === enrollment.id ? 'Copying…' : copiedId === enrollment.id ? 'Copied!' : 'Copy Setup Link'}</button>{enrollment.challenge_intake_completed && <button onClick={() => openLeaderboardNameEditor(enrollment)} className="border border-purple-400/50 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-400/10">Edit Leaderboard Name</button>}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirmingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4" role="dialog" aria-modal="true" aria-labelledby="setup-email-title">
          <div className="w-full max-w-md border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Confirm setup email</p>
            <h2 id="setup-email-title" className="mt-2 text-xl font-bold text-white">Send FUEL 42 app setup?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">This sends a secure access link to <strong className="text-white">{confirmingEnrollment.email}</strong>, assigns the participant to you as their FUEL 42 coach, and routes them around the regular $25/month payment page.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmingEnrollment(null)} className="border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400">Cancel</button>
              <button onClick={() => sendSetup(confirmingEnrollment)} className="bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">Send setup email</button>
            </div>
          </div>
        </div>
      )}

      {editingNameEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4" role="dialog" aria-modal="true" aria-labelledby="leaderboard-name-title">
          <div className="w-full max-w-md border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-300">Public leaderboard display</p>
            <h2 id="leaderboard-name-title" className="mt-2 text-xl font-bold text-white">Edit leaderboard name</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">This changes only the public name shown for <strong className="text-white">{editingNameEnrollment.full_name || editingNameEnrollment.email}</strong>. It does not change their account name, privacy choices, goals, health information, scans, macros, or points.</p>
            <label className="mt-5 block text-sm font-semibold text-slate-200" htmlFor="leaderboard-display-name">Display name</label>
            <input id="leaderboard-display-name" value={leaderboardName} onChange={event => setLeaderboardName(event.target.value)} maxLength={60} placeholder="First name + last initial" className="mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500 focus:border-purple-300 focus:outline-none" />
            <p className="mt-2 text-xs leading-5 text-slate-500">Leave blank to return to the participant’s default first name and last initial.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingNameEnrollment(null)} disabled={savingName} className="border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-60">Cancel</button>
              <button onClick={saveLeaderboardName} disabled={savingName} className="bg-purple-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-purple-200 disabled:opacity-60">{savingName ? 'Saving…' : 'Save display name'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
