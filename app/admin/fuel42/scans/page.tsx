'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Scan = { id: string; scan_date: string; weight_lbs: number | null; percent_body_fat: number | null; skeletal_muscle_mass_lbs: number | null; source: string | null }

function formatScan(scan: Scan) {
  const values = [
    new Date(`${scan.scan_date}T12:00:00`).toLocaleDateString(),
    scan.weight_lbs != null ? `${scan.weight_lbs} lb` : null,
    scan.percent_body_fat != null ? `${scan.percent_body_fat}% body fat` : null,
    scan.skeletal_muscle_mass_lbs != null ? `${scan.skeletal_muscle_mass_lbs} lb SMM` : null,
  ].filter(Boolean)
  return values.join(' · ')
}

export default function Fuel42ScanVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const athleteId = searchParams.get('athlete')
  const [scans, setScans] = useState<Scan[]>([])
  const [startingScanId, setStartingScanId] = useState('')
  const [finalScanId, setFinalScanId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!athleteId) { setLoading(false); return }
    fetch(`/api/challenges/fuel42/body-composition?athleteId=${encodeURIComponent(athleteId)}`)
      .then(async response => { if (!response.ok) throw new Error((await response.json()).error || 'Unable to load scans.'); return response.json() })
      .then(result => {
        setScans(result.scans || [])
        if (result.scans?.length) setStartingScanId(result.scans[0].id)
        if (result.scans?.length > 1) setFinalScanId(result.scans[result.scans.length - 1].id)
      })
      .catch(error => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [athleteId])

  async function save() {
    if (!athleteId || !startingScanId || !finalScanId || startingScanId === finalScanId) {
      setMessage('Choose two different scans: one starting and one final scan.')
      return
    }
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/challenges/fuel42/body-composition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ athleteId, startingScanId, finalScanId }) })
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to verify scans.')
      setMessage('FUEL 42 body-composition points are verified and will appear on the participant leaderboard.')
    } catch (error: any) { setMessage(error.message) } finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white"><div className="mx-auto max-w-2xl"><button onClick={() => router.push('/admin/fuel42')} className="text-sm font-semibold text-emerald-300">← FUEL 42 roster</button><p className="mt-6 text-xs font-bold tracking-[0.16em] text-emerald-400">STAFF ONLY · FINAL SCAN REVIEW</p><h1 className="mt-1 text-2xl font-bold">Verify Body-Composition Points</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Select the participant’s starting and final scans. The app will calculate private body-fat and skeletal-muscle points from the verified scan pair. Individual scan values never appear on the public leaderboard.</p>{loading ? <p className="mt-8 text-slate-400">Loading scans…</p> : scans.length < 2 ? <p className="mt-8 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">This participant needs two body-composition scans before final points can be verified.</p> : <div className="mt-8 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><label className="block text-sm font-semibold text-slate-200">Starting scan<select value={startingScanId} onChange={event => setStartingScanId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white">{scans.map(scan => <option key={scan.id} value={scan.id}>{formatScan(scan)}</option>)}</select></label><label className="block text-sm font-semibold text-slate-200">Final scan<select value={finalScanId} onChange={event => setFinalScanId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white">{scans.map(scan => <option key={scan.id} value={scan.id}>{formatScan(scan)}</option>)}</select></label><button onClick={save} disabled={saving} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-60">{saving ? 'Verifying…' : 'Verify Final Body-Comp Points'}</button></div>}{message && <p className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">{message}</p>}</div></main>
}
