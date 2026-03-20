'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

function StatCard({
  label, value, unit, change, lowerIsBetter = false, accent,
}: {
  label: string; value: string; unit: string
  change: { value: string; dir: 'up' | 'down' | 'flat' } | null
  lowerIsBetter?: boolean; accent: string
}) {
  const isGood =
    !change || change.dir === 'flat' ? null
    : lowerIsBetter ? change.dir === 'down'
    : change.dir === 'up'
  const changeColor = change?.dir === 'flat' ? '#6b7280' : isGood ? '#22c55e' : '#ef4444'
  const changePrefix = change?.dir === 'up' ? '▲' : change?.dir === 'down' ? '▼' : '●'

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: accent, borderRadius: '12px 0 0 12px' }} />
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px', paddingLeft: '8px' }}>{label}</div>
      <div style={{ paddingLeft: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{value}</span>
        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>{unit}</span>
      </div>
      {change && (
        <div style={{ paddingLeft: '8px', marginTop: '6px', fontSize: '12px', color: changeColor }}>
          {changePrefix} {change.value} {unit} from last scan
        </div>
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
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px' }}>
        {values.map((v, i) => (
          <div key={i} title={`${v.toFixed(1)}`} style={{ flex: 1, height: `${Math.max(4, ((v - min) / range) * 44 + 4)}px`, background: i === values.length - 1 ? color : `${color}55`, borderRadius: '3px 3px 0 0' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: '#4b5563' }}>{formatDate(scans[0].scan_date)}</span>
        <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>{values[values.length - 1].toFixed(1)}</span>
        <span style={{ fontSize: '10px', color: '#4b5563' }}>{formatDate(scans[scans.length - 1].scan_date)}</span>
      </div>
    </div>
  )
}

function ScanRow({ scan, prev, isLatest }: { scan: BodyScan; prev: BodyScan | null; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: isLatest ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', background: isLatest ? 'rgba(251,146,60,0.04)' : 'rgba(255,255,255,0.02)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isLatest && <span style={{ fontSize: '10px', background: 'rgba(251,146,60,0.2)', color: '#fb923c', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Latest</span>}
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>{formatDate(scan.scan_date)}</span>
          {scan.source && <span style={{ fontSize: '11px', color: '#4b5563', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>{scan.source}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {scan.inbody_score !== null && (
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>InBody Score</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fb923c', fontFamily: 'monospace' }}>{scan.inbody_score}</div>
            </div>
          )}
          {scan.weight_lbs !== null && (
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Weight</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{fmt(scan.weight_lbs)} <span style={{ fontSize: '12px', color: '#6b7280' }}>lbs</span></div>
            </div>
          )}
          <div style={{ color: '#4b5563', fontSize: '18px', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>↓</div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginTop: '14px' }}>
            {[
              { label: 'Body Fat %', value: fmt(scan.body_fat_percent), unit: '%', change: delta(scan.body_fat_percent, prev?.body_fat_percent ?? null), lowerIsBetter: true, accent: '#ef4444' },
              { label: 'Muscle Mass', value: fmt(scan.skeletal_muscle_mass_lbs), unit: 'lbs', change: delta(scan.skeletal_muscle_mass_lbs, prev?.skeletal_muscle_mass_lbs ?? null), accent: '#22c55e' },
              { label: 'Body Fat', value: fmt(scan.body_fat_lbs), unit: 'lbs', change: delta(scan.body_fat_lbs, prev?.body_fat_lbs ?? null), lowerIsBetter: true, accent: '#ef4444' },
              { label: 'Fat-Free Mass', value: fmt(scan.fat_free_mass_lbs), unit: 'lbs', change: delta(scan.fat_free_mass_lbs, prev?.fat_free_mass_lbs ?? null), accent: '#3b82f6' },
              { label: 'BMR', value: fmt(scan.bmr_calories, 0), unit: 'kcal', change: null, accent: '#a855f7' },
              { label: 'BMI', value: fmt(scan.bmi), unit: '', change: delta(scan.bmi, prev?.bmi ?? null), lowerIsBetter: true, accent: '#6b7280' },
              { label: 'Total Body Water', value: fmt(scan.total_body_water_lbs), unit: 'lbs', change: null, accent: '#06b6d4' },
              { label: 'ECW/TBW Ratio', value: fmt(scan.ecw_tbw_ratio, 3), unit: '', change: null, accent: '#06b6d4' },
              { label: 'Visceral Fat', value: scan.visceral_fat_level?.toString() ?? '—', unit: '', change: delta(scan.visceral_fat_level, prev?.visceral_fat_level ?? null), lowerIsBetter: true, accent: '#f97316' },
              { label: 'Bone Mass', value: fmt(scan.bone_mass_lbs), unit: 'lbs', change: null, accent: '#94a3b8' },
            ].map((s) => <StatCard key={s.label} {...s} />)}
          </div>
          {scan.notes && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid #fb923c' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Coach Notes</div>
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>{scan.notes}</div>
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', fontFamily: 'monospace' }}>
      Loading scan data...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
      Error: {error}
    </div>
  )

  return (
    <>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0a0f; }`}</style>
      <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'system-ui, sans-serif', color: '#f1f5f9' }}>

        {/* Nav */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/athlete/dashboard" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Body Composition</span>
          </div>
          <span style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'monospace' }}>FUEL DIFFERENT</span>
        </div>

        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
              {athleteName ? `${athleteName}'s` : 'Your'} Progress
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {scans.length === 0 ? 'No scans recorded yet' : `${scans.length} scan${scans.length > 1 ? 's' : ''} · InBody 580`}
            </p>
          </div>

          {scans.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '80px 20px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
              <div style={{ color: '#6b7280', fontSize: '15px' }}>No body scans on file yet.</div>
              <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '8px' }}>Your coach will add scans after your InBody assessment.</div>
            </div>
          ) : (
            <>
              {/* Latest snapshot */}
              {latest && (
                <div style={{ marginBottom: '36px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '16px' }}>
                    Latest Snapshot · {formatDate(latest.scan_date)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                    <StatCard label="Weight" value={fmt(latest.weight_lbs)} unit="lbs" change={delta(latest.weight_lbs, previous?.weight_lbs ?? null)} accent="#fb923c" />
                    <StatCard label="Body Fat %" value={fmt(latest.body_fat_percent)} unit="%" change={delta(latest.body_fat_percent, previous?.body_fat_percent ?? null)} lowerIsBetter accent="#ef4444" />
                    <StatCard label="Muscle Mass" value={fmt(latest.skeletal_muscle_mass_lbs)} unit="lbs" change={delta(latest.skeletal_muscle_mass_lbs, previous?.skeletal_muscle_mass_lbs ?? null)} accent="#22c55e" />
                    <StatCard label="InBody Score" value={latest.inbody_score?.toString() ?? '—'} unit="" change={delta(latest.inbody_score, previous?.inbody_score ?? null)} accent="#fb923c" />
                    <StatCard label="BMR" value={fmt(latest.bmr_calories, 0)} unit="kcal" change={null} accent="#a855f7" />
                    <StatCard label="Visceral Fat" value={latest.visceral_fat_level?.toString() ?? '—'} unit="" change={delta(latest.visceral_fat_level, previous?.visceral_fat_level ?? null)} lowerIsBetter accent="#f97316" />
                  </div>
                </div>
              )}

              {/* Trends */}
              {scans.length >= 2 && (
                <div style={{ marginBottom: '36px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '20px' }}>Trends Over Time</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                    <TrendBar scans={scans} field="weight_lbs" label="Weight (lbs)" color="#fb923c" />
                    <TrendBar scans={scans} field="body_fat_percent" label="Body Fat %" color="#ef4444" />
                    <TrendBar scans={scans} field="skeletal_muscle_mass_lbs" label="Muscle Mass (lbs)" color="#22c55e" />
                    <TrendBar scans={scans} field="inbody_score" label="InBody Score" color="#fb923c" />
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '16px' }}>Scan History</div>
                {[...scans].reverse().map((scan, i) => (
                  <ScanRow key={scan.id} scan={scan} prev={scans[scans.length - 2 - i] ?? null} isLatest={i === 0} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}