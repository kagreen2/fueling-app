'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import InBodyProgressCharts from '@/components/InBodyProgressCharts'
import { getLocalDateString } from '@/lib/utils/date'

interface BiometricScan {
  id: string
  athlete_id: string
  scan_date: string
  // Body Composition Analysis
  intracellular_water_lbs: number | null
  extracellular_water_lbs: number | null
  dry_lean_mass_lbs: number | null
  body_fat_mass_lbs: number | null
  total_body_water_lbs: number | null
  fat_free_mass_lbs: number | null
  weight_lbs: number | null
  // Muscle-Fat Analysis
  skeletal_muscle_mass_lbs: number | null
  // Obesity Analysis
  bmi: number | null
  percent_body_fat: number | null
  // Segmental Lean Analysis
  seg_lean_right_arm_lbs: number | null
  seg_lean_left_arm_lbs: number | null
  seg_lean_trunk_lbs: number | null
  seg_lean_right_leg_lbs: number | null
  seg_lean_left_leg_lbs: number | null
  // ECW/TBW
  ecw_tbw_ratio: number | null
  // Visceral Fat
  visceral_fat_area_cm2: number | null
  // Metadata
  source: string
  notes: string | null
  photo_url: string | null
  created_at: string
}

// All InBody 580 form fields as strings for input handling
const emptyForm = {
  scan_date: getLocalDateString(),
  // Body Composition Analysis
  intracellular_water_lbs: '', extracellular_water_lbs: '', dry_lean_mass_lbs: '', body_fat_mass_lbs: '',
  total_body_water_lbs: '', fat_free_mass_lbs: '', weight_lbs: '',
  // Muscle-Fat Analysis
  skeletal_muscle_mass_lbs: '',
  // Obesity Analysis
  bmi: '', percent_body_fat: '',
  // Segmental Lean Analysis
  seg_lean_right_arm_lbs: '', seg_lean_left_arm_lbs: '', seg_lean_trunk_lbs: '', seg_lean_right_leg_lbs: '', seg_lean_left_leg_lbs: '',
  // ECW/TBW
  ecw_tbw_ratio: '',
  // Visceral Fat
  visceral_fat_area_cm2: '',
  notes: '',
}

type FormData = typeof emptyForm

function formatChange(current: number | null, previous: number | null, unit: string = '', invert: boolean = false) {
  if (current == null || previous == null) return null
  const diff = current - previous
  if (diff === 0) return { text: 'No change', color: 'text-slate-400' }
  const arrow = diff > 0 ? '↑' : '↓'
  const isGood = invert ? diff < 0 : diff > 0
  return { text: `${arrow} ${Math.abs(diff).toFixed(1)}${unit}`, color: isGood ? 'text-green-400' : 'text-red-400' }
}

export default function BiometricsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [scans, setScans] = useState<BiometricScan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [expandedScan, setExpandedScan] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: athlete } = await supabase.from('athletes').select('id').eq('profile_id', user.id).single()
      if (!athlete) { router.push('/athlete/onboarding'); return }
      setAthleteId(athlete.id)
      const { data: scansData } = await supabase.from('biometric_scans').select('*').eq('athlete_id', athlete.id).order('scan_date', { ascending: false })
      if (scansData) setScans(scansData)
      setLoading(false)
    } catch (error) { console.error('Error loading biometrics:', error); setLoading(false) }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanFile(file)
    setScanPreview(URL.createObjectURL(file))
    setScanError(null)
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/biometrics/scan-photo', { method: 'POST', body: fd })
      const result = await res.json()
      if (!res.ok) { setScanError(result.error || 'Failed to read scan. You can enter values manually.'); setScanning(false); return }
      const d = result.data
      // Map all OCR fields to form
      setForm(prev => {
        const updated = { ...prev }
        for (const key of Object.keys(emptyForm)) {
          if (key === 'scan_date' || key === 'notes') continue
          if (d[key] != null) (updated as any)[key] = d[key].toString()
        }
        return updated
      })
      setScanning(false)
    } catch { setScanError('Failed to process photo. You can enter values manually.'); setScanning(false) }
  }

  async function handleSave() {
    if (!athleteId || !userId) return
    setSaving(true)
    try {
      let photoUrl: string | null = null
      if (scanFile) {
        const fileName = `${athleteId}/${Date.now()}-${scanFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from('biometric-scans').upload(fileName, scanFile)
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('biometric-scans').getPublicUrl(uploadData.path)
          photoUrl = urlData.publicUrl
        }
      }
      const pn = (v: string) => v ? parseFloat(v) || null : null
      const { error } = await supabase.from('biometric_scans').insert({
        athlete_id: athleteId, scan_date: form.scan_date,
        intracellular_water_lbs: pn(form.intracellular_water_lbs), extracellular_water_lbs: pn(form.extracellular_water_lbs),
        dry_lean_mass_lbs: pn(form.dry_lean_mass_lbs), body_fat_mass_lbs: pn(form.body_fat_mass_lbs),
        total_body_water_lbs: pn(form.total_body_water_lbs), fat_free_mass_lbs: pn(form.fat_free_mass_lbs), weight_lbs: pn(form.weight_lbs),
        skeletal_muscle_mass_lbs: pn(form.skeletal_muscle_mass_lbs),
        bmi: pn(form.bmi), percent_body_fat: pn(form.percent_body_fat),
        seg_lean_right_arm_lbs: pn(form.seg_lean_right_arm_lbs), seg_lean_left_arm_lbs: pn(form.seg_lean_left_arm_lbs),
        seg_lean_trunk_lbs: pn(form.seg_lean_trunk_lbs), seg_lean_right_leg_lbs: pn(form.seg_lean_right_leg_lbs), seg_lean_left_leg_lbs: pn(form.seg_lean_left_leg_lbs),
        ecw_tbw_ratio: pn(form.ecw_tbw_ratio),
        visceral_fat_area_cm2: pn(form.visceral_fat_area_cm2),
        source: 'athlete', entered_by: userId, notes: form.notes || null, photo_url: photoUrl,
      })
      if (error) { alert('Error saving scan: ' + error.message); setSaving(false); return }
      // Update athlete record with latest weight and body fat
      const updates: any = {}
      if (form.percent_body_fat) updates.body_fat_percentage = parseFloat(form.percent_body_fat)
      if (form.weight_lbs) updates.weight_lbs = parseFloat(form.weight_lbs)
      if (Object.keys(updates).length > 0) await supabase.from('athletes').update(updates).eq('id', athleteId)
      setForm({ ...emptyForm }); setScanPreview(null); setScanFile(null); setScanError(null); setShowForm(false); setSaving(false)
      loadData()
    } catch (err) { console.error('Save error:', err); alert('Failed to save scan data.'); setSaving(false) }
  }

  async function handleDelete(scanId: string) {
    if (!confirm('Delete this scan? This cannot be undone.')) return
    await supabase.from('biometric_scans').delete().eq('id', scanId)
    loadData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-slate-400">Loading biometrics...</p>
        </div>
      </main>
    )
  }

  const latestScan = scans[0] || null
  const previousScan = scans[1] || null

  // Helper to render a metric card
  const MetricCard = ({ label, value, unit, color, prev, prevVal, invert }: { label: string; value: number | null; unit?: string; color?: string; prev?: BiometricScan | null; prevVal?: number | null; invert?: boolean }) => {
    if (value == null) return null
    const change = prev && prevVal != null ? formatChange(value, prevVal, unit ? ` ${unit}` : '', invert) : null
    return (
      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className={`text-xl font-bold ${color || 'text-white'}`}>{value}{unit === '%' || unit === '°' ? unit : ''}</p>
        {unit && unit !== '%' && unit !== '°' && <p className="text-xs text-slate-500">{unit}</p>}
        {change && <p className={`text-xs mt-1 ${change.color}`}>{change.text}</p>}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/athlete/dashboard')} className="text-slate-400 hover:text-white transition-colors">← Back</button>
            <div>
              <h1 className="text-lg font-bold text-white">Body Composition</h1>
              <p className="text-xs text-slate-400">InBody 580 Scan Results</p>
            </div>
          </div>
          <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm }) }} className="bg-purple-600 hover:bg-purple-700 text-sm">+ New Scan</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Progress Charts */}
        {scans.length >= 1 && (
          <InBodyProgressCharts scans={scans} />
        )}

        {/* Latest Scan Summary */}
        {latestScan && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Latest Scan</h2>
                  <p className="text-slate-400 text-sm">{new Date(latestScan.scan_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  {latestScan.source === 'coach' ? '👨‍🏫 Coach entered' : '🏃 Self-reported'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Body Composition Analysis */}
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Body Composition Analysis</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="Weight" value={latestScan.weight_lbs} unit="lbs" prev={previousScan} prevVal={previousScan?.weight_lbs} />
                  <MetricCard label="Body Fat Mass" value={latestScan.body_fat_mass_lbs} unit="lbs" color="text-red-400" prev={previousScan} prevVal={previousScan?.body_fat_mass_lbs} invert />
                  <MetricCard label="Fat Free Mass" value={latestScan.fat_free_mass_lbs} unit="lbs" color="text-green-400" prev={previousScan} prevVal={previousScan?.fat_free_mass_lbs} />
                  <MetricCard label="Total Body Water" value={latestScan.total_body_water_lbs} unit="lbs" color="text-cyan-400" />
                  <MetricCard label="Intracellular Water" value={latestScan.intracellular_water_lbs} unit="lbs" color="text-cyan-300" />
                  <MetricCard label="Extracellular Water" value={latestScan.extracellular_water_lbs} unit="lbs" color="text-cyan-500" />
                  <MetricCard label="Dry Lean Mass" value={latestScan.dry_lean_mass_lbs} unit="lbs" color="text-blue-400" />
                  <MetricCard label="SMM" value={latestScan.skeletal_muscle_mass_lbs} unit="lbs" color="text-blue-300" prev={previousScan} prevVal={previousScan?.skeletal_muscle_mass_lbs} />
                </div>
              </div>

              {/* Obesity Analysis */}
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Obesity Analysis</p>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="BMI" value={latestScan.bmi} color="text-yellow-400" />
                  <MetricCard label="Percent Body Fat" value={latestScan.percent_body_fat} unit="%" color="text-purple-400" prev={previousScan} prevVal={previousScan?.percent_body_fat} invert />
                </div>
              </div>

              {/* Segmental Lean Analysis */}
              {(latestScan.seg_lean_right_arm_lbs || latestScan.seg_lean_trunk_lbs || latestScan.seg_lean_right_leg_lbs) && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Segmental Lean Analysis (lbs)</p>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">R. Arm</p><p className="text-white font-medium">{latestScan.seg_lean_right_arm_lbs ?? '—'}</p></div>
                    <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">L. Arm</p><p className="text-white font-medium">{latestScan.seg_lean_left_arm_lbs ?? '—'}</p></div>
                    <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">Trunk</p><p className="text-white font-medium">{latestScan.seg_lean_trunk_lbs ?? '—'}</p></div>
                    <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">R. Leg</p><p className="text-white font-medium">{latestScan.seg_lean_right_leg_lbs ?? '—'}</p></div>
                    <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">L. Leg</p><p className="text-white font-medium">{latestScan.seg_lean_left_leg_lbs ?? '—'}</p></div>
                  </div>
                </div>
              )}

              {/* ECW/TBW & Visceral Fat */}
              {(latestScan.ecw_tbw_ratio != null || latestScan.visceral_fat_area_cm2 != null) && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">ECW/TBW & Visceral Fat</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="ECW/TBW Ratio" value={latestScan.ecw_tbw_ratio} color={latestScan.ecw_tbw_ratio != null && latestScan.ecw_tbw_ratio <= 0.39 ? 'text-green-400' : 'text-yellow-400'} />
                    {latestScan.visceral_fat_area_cm2 != null && (
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">Visceral Fat Area</p>
                        <p className={`text-xl font-bold ${latestScan.visceral_fat_area_cm2 <= 100 ? 'text-green-400' : latestScan.visceral_fat_area_cm2 <= 150 ? 'text-yellow-400' : 'text-red-400'}`}>{latestScan.visceral_fat_area_cm2}</p>
                        <p className="text-xs text-slate-500">cm²</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* New Scan Form */}
        {showForm && (
          <Card className="bg-slate-800/50 border-purple-500/50 border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">New InBody 580 Scan</h2>
                <button onClick={() => { setShowForm(false); setScanPreview(null); setScanFile(null); setScanError(null) }} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Photo Upload */}
              <div className="bg-slate-700/30 rounded-xl p-5 border border-dashed border-slate-600">
                <div className="text-center">
                  <p className="text-white font-medium mb-1">📸 Scan Your InBody 580 Printout</p>
                  <p className="text-slate-400 text-sm mb-3">Take a photo or upload — we'll read all the numbers automatically</p>
                  <p className="text-slate-500 text-[10px] mb-4 leading-snug max-w-md mx-auto">By uploading your InBody scan, you consent to Fuel Different collecting, processing, and securely storing your body composition data to provide personalized nutrition recommendations. This data is shared only with your assigned coach and is never sold. You may request deletion at any time. <a href="/privacy" target="_blank" className="text-purple-400 underline">Privacy Policy</a></p>
                  {!scanPreview ? (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700">📷 Take Photo / Upload</Button>
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <img src={scanPreview} alt="Scan preview" className="max-h-48 mx-auto rounded-lg border border-slate-600" />
                      {scanning && <div className="flex items-center justify-center gap-2 text-purple-400"><div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div><span className="text-sm">Reading your InBody 580 scan...</span></div>}
                      {scanError && <p className="text-yellow-400 text-sm">⚠️ {scanError}</p>}
                      {!scanning && !scanError && <p className="text-green-400 text-sm">✅ Numbers extracted! Review and edit below.</p>}
                      <button onClick={() => { setScanPreview(null); setScanFile(null); setScanError(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-white text-sm underline">Remove photo</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scan Date */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Scan Date</label>
                <input type="date" value={form.scan_date} onChange={e => setForm(prev => ({ ...prev, scan_date: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
              </div>

              {/* Body Composition Analysis */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Body Composition Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'weight_lbs', label: 'Weight (lbs)', p: '130.3' },
                    { key: 'intracellular_water_lbs', label: 'Intracellular Water (lbs)', p: '36.6' },
                    { key: 'extracellular_water_lbs', label: 'Extracellular Water (lbs)', p: '24.3' },
                    { key: 'dry_lean_mass_lbs', label: 'Dry Lean Mass (lbs)', p: '21.6' },
                    { key: 'body_fat_mass_lbs', label: 'Body Fat Mass (lbs)', p: '47.8' },
                    { key: 'total_body_water_lbs', label: 'Total Body Water (lbs)', p: '60.8' },
                    { key: 'fat_free_mass_lbs', label: 'Fat Free Mass (lbs)', p: '82.5' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                      <input type="number" step="0.1" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.p} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Muscle-Fat & Obesity Analysis */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Muscle-Fat & Obesity Analysis</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'skeletal_muscle_mass_lbs', label: 'Skeletal Muscle Mass (lbs)', p: '43.4' },
                    { key: 'bmi', label: 'BMI', p: '24.0' },
                    { key: 'percent_body_fat', label: 'Percent Body Fat (%)', p: '36.7' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                      <input type="number" step="0.1" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.p} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Segmental Lean Analysis */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Segmental Lean Analysis (lbs)</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'seg_lean_right_arm_lbs', label: 'R. Arm' },
                    { key: 'seg_lean_left_arm_lbs', label: 'L. Arm' },
                    { key: 'seg_lean_trunk_lbs', label: 'Trunk' },
                    { key: 'seg_lean_right_leg_lbs', label: 'R. Leg' },
                    { key: 'seg_lean_left_leg_lbs', label: 'L. Leg' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                      <input type="number" step="0.1" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm placeholder-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* ECW/TBW & Visceral Fat */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">ECW/TBW & Visceral Fat</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'ecw_tbw_ratio', label: 'ECW/TBW Ratio', p: '0.398' },
                    { key: 'visceral_fat_area_cm2', label: 'Visceral Fat Area (cm²)', p: '128.0' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                      <input type="number" step="0.001" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.p} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g. Fasted scan, morning weigh-in" rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" />
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving || scanning} className="bg-green-600 hover:bg-green-700 flex-1">{saving ? 'Saving...' : '💾 Save Scan'}</Button>
                <Button onClick={() => { setShowForm(false); setScanPreview(null); setScanFile(null); setScanError(null) }} className="bg-slate-700 hover:bg-slate-600">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Scan History</h2>
          {scans.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-400 mb-1">No body composition scans yet</p>
                <p className="text-slate-500 text-sm mb-4">Add your first InBody 580 scan to start tracking your progress</p>
                <Button onClick={() => { setShowForm(true); setForm({ ...emptyForm }) }} className="bg-purple-600 hover:bg-purple-700">+ Add First Scan</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scans.map((scan, idx) => {
                const prev = scans[idx + 1] || null
                const isExpanded = expandedScan === scan.id
                return (
                  <Card key={scan.id} className="bg-slate-800/50 border-slate-700">
                    <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors" onClick={() => setExpandedScan(isExpanded ? null : scan.id)}>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-white font-medium">{new Date(scan.scan_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-slate-400 text-xs">{scan.source === 'coach' ? '👨‍🏫 Coach' : '🏃 Self'}{scan.notes ? ` · ${scan.notes}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex gap-4 text-sm">
                          {scan.weight_lbs != null && <span className="text-slate-300">{scan.weight_lbs} lbs</span>}
                          {scan.percent_body_fat != null && <span className="text-purple-400">{scan.percent_body_fat}% BF</span>}
                          {scan.skeletal_muscle_mass_lbs != null && <span className="text-blue-400">{scan.skeletal_muscle_mass_lbs} SMM</span>}
                        </div>
                        <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <CardContent className="pt-0 pb-4 border-t border-slate-700 space-y-4">
                        {/* Body Composition */}
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Body Composition</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard label="Weight" value={scan.weight_lbs} unit="lbs" prev={prev} prevVal={prev?.weight_lbs} />
                            <MetricCard label="Body Fat Mass" value={scan.body_fat_mass_lbs} unit="lbs" color="text-red-400" prev={prev} prevVal={prev?.body_fat_mass_lbs} invert />
                            <MetricCard label="Fat Free Mass" value={scan.fat_free_mass_lbs} unit="lbs" color="text-green-400" prev={prev} prevVal={prev?.fat_free_mass_lbs} />
                            <MetricCard label="SMM" value={scan.skeletal_muscle_mass_lbs} unit="lbs" color="text-blue-400" prev={prev} prevVal={prev?.skeletal_muscle_mass_lbs} />
                            <MetricCard label="TBW" value={scan.total_body_water_lbs} unit="lbs" color="text-cyan-400" />
                            <MetricCard label="ICW" value={scan.intracellular_water_lbs} unit="lbs" color="text-cyan-300" />
                            <MetricCard label="ECW" value={scan.extracellular_water_lbs} unit="lbs" color="text-cyan-500" />
                            <MetricCard label="Dry Lean" value={scan.dry_lean_mass_lbs} unit="lbs" color="text-blue-300" />
                          </div>
                        </div>
                        {/* Obesity */}
                        <div>
                          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Obesity Analysis</p>
                          <div className="grid grid-cols-2 gap-3">
                            <MetricCard label="BMI" value={scan.bmi} color="text-yellow-400" />
                            <MetricCard label="PBF" value={scan.percent_body_fat} unit="%" color="text-purple-400" prev={prev} prevVal={prev?.percent_body_fat} invert />
                          </div>
                        </div>
                        {/* Segmental Lean */}
                        {(scan.seg_lean_right_arm_lbs || scan.seg_lean_trunk_lbs) && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Segmental Lean (lbs)</p>
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                              <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">R.Arm</p><p className="text-white font-medium">{scan.seg_lean_right_arm_lbs ?? '—'}</p></div>
                              <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">L.Arm</p><p className="text-white font-medium">{scan.seg_lean_left_arm_lbs ?? '—'}</p></div>
                              <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">Trunk</p><p className="text-white font-medium">{scan.seg_lean_trunk_lbs ?? '—'}</p></div>
                              <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">R.Leg</p><p className="text-white font-medium">{scan.seg_lean_right_leg_lbs ?? '—'}</p></div>
                              <div className="bg-slate-700/30 rounded-lg p-2"><p className="text-slate-500">L.Leg</p><p className="text-white font-medium">{scan.seg_lean_left_leg_lbs ?? '—'}</p></div>
                            </div>
                          </div>
                        )}
                        {/* ECW/TBW & VFA */}
                        {(scan.ecw_tbw_ratio != null || scan.visceral_fat_area_cm2 != null) && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">ECW/TBW & Visceral Fat</p>
                            <div className="grid grid-cols-3 gap-3">
                              <MetricCard label="ECW/TBW" value={scan.ecw_tbw_ratio} color={scan.ecw_tbw_ratio != null && scan.ecw_tbw_ratio <= 0.39 ? 'text-green-400' : 'text-yellow-400'} />
                              <MetricCard label="VFA" value={scan.visceral_fat_area_cm2} unit="cm²" color={scan.visceral_fat_area_cm2 != null && scan.visceral_fat_area_cm2 <= 100 ? 'text-green-400' : 'text-yellow-400'} />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                          <button onClick={() => handleDelete(scan.id)} className="text-red-400 hover:text-red-300 text-xs">🗑 Delete Scan</button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
