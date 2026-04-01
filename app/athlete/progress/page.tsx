'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BodyScan {
  id: string
  athlete_id: string
  scanned_by: string | null
  scan_date: string
  weight_lbs: number | null
  skeletal_muscle_mass_lbs: number | null
  body_fat_lbs: number | null
  body_fat_percent: number | null
  fat_free_mass_lbs: number | null
  dry_lean_mass_lbs: number | null
  total_body_water_lbs: number | null
  intracellular_water_lbs: number | null
  extracellular_water_lbs: number | null
  ecw_tbw_ratio: number | null
  bmi: number | null
  bmr_calories: number | null
  visceral_fat_level: number | null
  inbody_score: number | null
  bone_mass_lbs: number | null
  notes: string | null
  source: string | null
  created_at: string | null
}

function fmt(val: number | null, decimals = 1): string {
  if (val === null || val === undefined) return '—'
  return Number(val).toFixed(decimals)
}

function delta(
  current: number | null,
  previous: number | null
): { value: string; dir: 'up' | 'down' | 'flat' } | null {
  if (current === null || previous === null) return null
  const diff = Number(current) - Number(previous)
  if (Math.abs(diff) < 0.05) return { value: '0.0', dir: 'flat' }
  return { value: Math.abs(diff).toFixed(1), dir: diff > 0 ? 'up' : 'down' }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Accent color mapping using Tailwind classes
const ACCENT_CLASSES: Record<string, { border: string; text: string }> = {
  purple: { border: 'border-l-purple-500', text: 'text-purple-400' },
  red: { border: 'border-l-red-500', text: 'text-red-400' },
  green: { border: 'border-l-green-500', text: 'text-green-400' },
  blue: { border: 'border-l-blue-500', text: 'text-blue-400' },
  cyan: { border: 'border-l-cyan-500', text: 'text-cyan-400' },
  slate: { border: 'border-l-slate-500', text: 'text-slate-400' },
}

function MetricCard({
  label, value, unit, change, lowerIsBetter = false, accent = 'purple',
}: {
  label: string; value: string; unit: string
  change: { value: string; dir: 'up' | 'down' | 'flat' } | null
  lowerIsBetter?: boolean; accent?: string
}) {
  const isGood =
    !change || change.dir === 'flat' ? null
    : lowerIsBetter ? change.dir === 'down'
    : change.dir === 'up'
  const accentClasses = ACCENT_CLASSES[accent] || ACCENT_CLASSES.purple

  return (
    <div className={`bg-slate-800/60 border border-slate-700 border-l-[3px] ${accentClasses.border} rounded-xl p-4 relative`}>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {change && change.dir !== 'flat' && (
        <p className={`text-xs mt-1.5 ${isGood ? 'text-green-400' : 'text-red-400'}`}>
          {change.dir === 'up' ? '▲' : '▼'} {change.value} {unit} from last scan
        </p>
      )}
      {change && change.dir === 'flat' && (
        <p className="text-xs mt-1.5 text-slate-500">No change</p>
      )}
    </div>
  )
}

function TrendBar({ scans, field, label, color }: { scans: BodyScan[]; field: keyof BodyScan; label: string; color: string }) {
  const values = scans.map((s) => Number(s[field])).filter((v) => !isNaN(v) && v > 0)
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return (
    <div className="mb-5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-1 h-12">
        {values.map((v, i) => (
          <div
            key={i}
            title={`${v.toFixed(1)}`}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${Math.max(4, ((v - min) / range) * 44 + 4)}px`,
              background: i === values.length - 1 ? color : `${color}44`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-600">{formatDate(scans[0].scan_date)}</span>
        <span className="text-[10px] text-slate-400 font-semibold tabular-nums">{values[values.length - 1].toFixed(1)}</span>
        <span className="text-[10px] text-slate-600">{formatDate(scans[scans.length - 1].scan_date)}</span>
      </div>
    </div>
  )
}

function ScanRow({ scan, prev, isLatest }: { scan: BodyScan; prev: BodyScan | null; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden mb-2 transition-all ${
      isLatest
        ? 'border-purple-500/30 bg-purple-500/5'
        : 'border-slate-700 bg-slate-800/40'
    }`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isLatest && (
            <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              Latest
            </span>
          )}
          <span className="text-white font-semibold text-sm">{formatDate(scan.scan_date)}</span>
          {scan.source && (
            <span className="text-[11px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{scan.source}</span>
          )}
        </div>
        <div className="flex items-center gap-5">
          {scan.inbody_score !== null && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Score</p>
              <p className="text-lg font-bold text-purple-400 tabular-nums">{scan.inbody_score}</p>
            </div>
          )}
          {scan.weight_lbs !== null && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Weight</p>
              <p className="text-lg font-bold text-white tabular-nums">
                {fmt(scan.weight_lbs)} <span className="text-xs text-slate-500">lbs</span>
              </p>
            </div>
          )}
          <span className={`text-slate-500 text-lg transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ↓
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Body Fat %', value: fmt(scan.body_fat_percent), unit: '%', change: delta(scan.body_fat_percent, prev?.body_fat_percent ?? null), lowerIsBetter: true, accent: 'red' },
              { label: 'Muscle Mass', value: fmt(scan.skeletal_muscle_mass_lbs), unit: 'lbs', change: delta(scan.skeletal_muscle_mass_lbs, prev?.skeletal_muscle_mass_lbs ?? null), accent: 'green' },
              { label: 'Body Fat', value: fmt(scan.body_fat_lbs), unit: 'lbs', change: delta(scan.body_fat_lbs, prev?.body_fat_lbs ?? null), lowerIsBetter: true, accent: 'red' },
              { label: 'Fat-Free Mass', value: fmt(scan.fat_free_mass_lbs), unit: 'lbs', change: delta(scan.fat_free_mass_lbs, prev?.fat_free_mass_lbs ?? null), accent: 'blue' },
              { label: 'BMR', value: fmt(scan.bmr_calories, 0), unit: 'kcal', change: null, accent: 'purple' },
              { label: 'BMI', value: fmt(scan.bmi), unit: '', change: delta(scan.bmi, prev?.bmi ?? null), lowerIsBetter: true, accent: 'slate' },
              { label: 'Total Body Water', value: fmt(scan.total_body_water_lbs), unit: 'lbs', change: null, accent: 'cyan' },
              { label: 'ECW/TBW Ratio', value: fmt(scan.ecw_tbw_ratio, 3), unit: '', change: null, accent: 'cyan' },
              { label: 'Visceral Fat', value: scan.visceral_fat_level?.toString() ?? '—', unit: '', change: delta(scan.visceral_fat_level, prev?.visceral_fat_level ?? null), lowerIsBetter: true, accent: 'red' },
              { label: 'Bone Mass', value: fmt(scan.bone_mass_lbs), unit: 'lbs', change: null, accent: 'slate' },
            ].map((s) => <MetricCard key={s.label} {...s} />)}
          </div>
          {scan.notes && (
            <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Coach Notes</p>
              <p className="text-sm text-slate-300 leading-relaxed">{scan.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProgressPage() {
  const supabase = createClient()
  const router = useRouter()
  const [scans, setScans] = useState<BodyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('id', user.id)
        .single()
      if (profile) setAthleteName((profile as any).first_name || (profile as any).full_name || '')

      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('athlete_id', user.id)
        .order('scan_date', { ascending: true })

      if (error) { setError(error.message); setLoading(false); return }
      setScans(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const latest = scans[scans.length - 1] ?? null
  const previous = scans[scans.length - 2] ?? null

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading scan data...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/athlete/dashboard')}
              className="text-slate-400 hover:text-white transition-colors text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold">Body Composition</h1>
              <p className="text-xs text-slate-400">
                {scans.length === 0 ? 'No scans recorded' : `${scans.length} scan${scans.length > 1 ? 's' : ''} · InBody 580`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">
            {athleteName ? `${athleteName}'s` : 'Your'} Progress
          </h2>
          {scans.length > 1 && (
            <p className="text-sm text-slate-400">
              Tracking since {formatDate(scans[0].scan_date)}
            </p>
          )}
        </div>

        {scans.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">No body scans on file yet</p>
            <p className="text-slate-500 text-sm">Your coach will add scans after your InBody assessment.</p>
          </div>
        ) : (
          <>
            {/* Latest Snapshot */}
            {latest && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Latest Snapshot · {formatDate(latest.scan_date)}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetricCard label="Weight" value={fmt(latest.weight_lbs)} unit="lbs" change={delta(latest.weight_lbs, previous?.weight_lbs ?? null)} accent="purple" />
                  <MetricCard label="Body Fat %" value={fmt(latest.body_fat_percent)} unit="%" change={delta(latest.body_fat_percent, previous?.body_fat_percent ?? null)} lowerIsBetter accent="red" />
                  <MetricCard label="Muscle Mass" value={fmt(latest.skeletal_muscle_mass_lbs)} unit="lbs" change={delta(latest.skeletal_muscle_mass_lbs, previous?.skeletal_muscle_mass_lbs ?? null)} accent="green" />
                  <MetricCard label="InBody Score" value={latest.inbody_score?.toString() ?? '—'} unit="" change={delta(latest.inbody_score, previous?.inbody_score ?? null)} accent="purple" />
                  <MetricCard label="BMR" value={fmt(latest.bmr_calories, 0)} unit="kcal" change={null} accent="blue" />
                  <MetricCard label="Visceral Fat" value={latest.visceral_fat_level?.toString() ?? '—'} unit="" change={delta(latest.visceral_fat_level, previous?.visceral_fat_level ?? null)} lowerIsBetter accent="red" />
                </div>
              </div>
            )}

            {/* Trends */}
            {scans.length >= 2 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Trends Over Time
                </h3>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <TrendBar scans={scans} field="weight_lbs" label="Weight (lbs)" color="#9333EA" />
                    <TrendBar scans={scans} field="body_fat_percent" label="Body Fat %" color="#ef4444" />
                    <TrendBar scans={scans} field="skeletal_muscle_mass_lbs" label="Muscle Mass (lbs)" color="#22c55e" />
                    <TrendBar scans={scans} field="inbody_score" label="InBody Score" color="#9333EA" />
                  </div>
                </div>
              </div>
            )}

            {/* Scan History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Scan History
              </h3>
              {[...scans].reverse().map((scan, i) => (
                <ScanRow key={scan.id} scan={scan} prev={scans[scans.length - 2 - i] ?? null} isLatest={i === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
