'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CoachDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [athletes, setAthletes] = useState<any[]>([])
  const [supplements, setSupplements] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showScanModal, setShowScanModal] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    if (!profileData || !['coach', 'admin', 'super_admin'].includes(profileData.role)) {
      router.push('/athlete/dashboard')
      return
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('team_id')
      .eq('profile_id', user.id)
      .single()

    if (staffData?.team_id) {
      const { data: athleteData } = await supabase
        .from('athletes')
        .select(`
          id,
          weight_lbs,
          goal_phase,
          season_phase,
          onboarding_complete,
          profiles!athletes_profile_id_fkey(full_name, email)
        `)
        .eq('team_id', staffData.team_id)

      if (athleteData) setAthletes(athleteData)
    }

    const { data: suppData } = await supabase
      .from('supplements')
      .select(`
        *,
        athletes(
          profiles!athletes_profile_id_fkey(full_name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (suppData) setSupplements(suppData)

    const { data: alertData } = await supabase
      .from('alerts')
      .select(`
        *,
        athletes(
          profiles!athletes_profile_id_fkey(full_name)
        )
      `)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (alertData) setAlerts(alertData)

    setLoading(false)
  }

  async function handleSupplementAction(
    suppId: string,
    action: 'approved' | 'denied',
    notes: string = ''
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('supplements')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewer_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suppId)

    setSupplements(prev => prev.filter(s => s.id !== suppId))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const severityColor: any = {
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  }

  const riskColor: any = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-red-400',
    banned: 'text-red-500 font-bold',
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Coach Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">{profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanModal(true)}
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              + Log Scan
            </button>
            <button
              onClick={handleSignOut}
              className="text-zinc-600 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-white">{athletes.length}</div>
            <div className="text-zinc-500 text-xs mt-1">Athletes</div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-yellow-400">{supplements.length}</div>
            <div className="text-zinc-500 text-xs mt-1">Pending supplements</div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-bold text-red-400">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-zinc-500 text-xs mt-1">Critical alerts</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {[
            { id: 'overview', label: 'Athletes' },
            { id: 'supplements', label: `Supplements ${supplements.length > 0 ? `(${supplements.length})` : ''}` },
            { id: 'alerts', label: `Alerts ${alerts.length > 0 ? `(${alerts.length})` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Athletes tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-3">
            {athletes.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-zinc-400 font-medium">No athletes on your team yet</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Athletes will appear here once they join your team
                </p>
              </div>
            ) : (
              athletes.map(a => (
                <div key={a.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {a.profiles?.full_name || 'Unknown athlete'}
                      </h3>
                      <p className="text-zinc-500 text-sm">{a.profiles?.email}</p>
                      <div className="flex gap-3 mt-2">
                        {a.goal_phase && (
                          <span className="text-zinc-600 text-xs capitalize">
                            {a.goal_phase.replace(/_/g, ' ')}
                          </span>
                        )}
                        {a.weight_lbs && (
                          <span className="text-zinc-600 text-xs">{a.weight_lbs} lbs</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.onboarding_complete
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {a.onboarding_complete ? 'Active' : 'Onboarding'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Supplements tab */}
        {activeTab === 'supplements' && (
          <div className="flex flex-col gap-4">
            {supplements.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-zinc-400 font-medium">No pending supplements</p>
                <p className="text-zinc-600 text-sm mt-2">
                  All supplement requests have been reviewed
                </p>
              </div>
            ) : (
              supplements.map(s => (
                <SupplementCard
                  key={s.id}
                  supplement={s}
                  onApprove={(notes) => handleSupplementAction(s.id, 'approved', notes)}
                  onDeny={(notes) => handleSupplementAction(s.id, 'denied', notes)}
                  riskColor={riskColor}
                />
              ))
            )}
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div className="flex flex-col gap-3">
            {alerts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-zinc-400 font-medium">No active alerts</p>
                <p className="text-zinc-600 text-sm mt-2">All athletes are on track</p>
              </div>
            ) : (
              alerts.map(a => (
                <div
                  key={a.id}
                  className={`rounded-2xl p-4 border ${severityColor[a.severity]}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {a.athletes?.profiles?.full_name || 'Unknown athlete'}
                      </p>
                      <p className="text-sm mt-1 opacity-90">{a.message}</p>
                      <p className="text-xs mt-2 opacity-60">
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-bold uppercase opacity-70 capitalize">
                      {a.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Scan modal */}
      {showScanModal && (
        <ScanEntryModal
          athletes={athletes}
          onClose={() => setShowScanModal(false)}
          onSaved={() => console.log('Scan saved!')}
        />
      )}

    </main>
  )
}

function SupplementCard({
  supplement: s,
  onApprove,
  onDeny,
  riskColor,
}: {
  supplement: any
  onApprove: (notes: string) => void
  onDeny: (notes: string) => void
  riskColor: any
}) {
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny' | null>(null)

  function handleAction(type: 'approve' | 'deny') {
    if (type === 'approve') onApprove(notes)
    else onDeny(notes)
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{s.name}</h3>
          {s.brand && <p className="text-zinc-500 text-sm">{s.brand}</p>}
          <p className="text-zinc-600 text-xs mt-1">
            {s.athletes?.profiles?.full_name || 'Unknown athlete'}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase ${riskColor[s.risk_level]}`}>
          {s.risk_level} risk
        </span>
      </div>

      {s.ai_explanation && (
        <div className="bg-zinc-800 rounded-xl p-3 mb-4">
          <p className="text-xs text-zinc-300 leading-relaxed">{s.ai_explanation}</p>
        </div>
      )}

      {showNotes && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes for the athlete (optional)..."
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none mb-3"
        />
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setAction('approve')
            if (!showNotes) setShowNotes(true)
            else handleAction('approve')
          }}
          className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {showNotes && action === 'approve' ? 'Confirm Approve' : 'Approve'}
        </button>
        <button
          onClick={() => {
            setAction('deny')
            if (!showNotes) setShowNotes(true)
            else handleAction('deny')
          }}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl transition-colors text-sm border border-red-500/30"
        >
          {showNotes && action === 'deny' ? 'Confirm Deny' : 'Deny'}
        </button>
        {!showNotes && (
          <button
            onClick={() => setShowNotes(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm"
          >
            + Notes
          </button>
        )}
      </div>
    </div>
  )
}

function ScanEntryModal({
  athletes,
  onClose,
  onSaved,
}: {
  athletes: any[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [form, setForm] = useState({
    scan_date: new Date().toISOString().split('T')[0],
    weight_lbs: '',
    skeletal_muscle_mass_lbs: '',
    body_fat_percent: '',
    body_fat_lbs: '',
    fat_free_mass_lbs: '',
    dry_lean_mass_lbs: '',
    total_body_water_lbs: '',
    intracellular_water_lbs: '',
    extracellular_water_lbs: '',
    ecw_tbw_ratio: '',
    bmi: '',
    bmr_calories: '',
    visceral_fat_level: '',
    inbody_score: '',
    bone_mass_lbs: '',
    notes: '',
  })

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!selectedAthlete) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const payload: any = {
      athlete_id: selectedAthlete,
      scanned_by: user?.id,
      scan_date: form.scan_date,
      source: 'manual',
      notes: form.notes || null,
    }

    const numericFields = [
      'weight_lbs', 'skeletal_muscle_mass_lbs', 'body_fat_percent',
      'body_fat_lbs', 'fat_free_mass_lbs', 'dry_lean_mass_lbs',
      'total_body_water_lbs', 'intracellular_water_lbs', 'extracellular_water_lbs',
      'ecw_tbw_ratio', 'bmi', 'bmr_calories', 'visceral_fat_level',
      'inbody_score', 'bone_mass_lbs'
    ]
    numericFields.forEach(field => {
      if (form[field as keyof typeof form]) {
        payload[field] = parseFloat(form[field as keyof typeof form])
      }
    })

    await supabase.from('body_scans').insert(payload)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-lg">Log Body Scan</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Athlete selector */}
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">
              Athlete *
            </label>
            <select
              value={selectedAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Select athlete...</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.profiles?.full_name || a.profiles?.email}
                </option>
              ))}
            </select>
          </div>

          {/* Scan date */}
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">
              Scan Date *
            </label>
            <input
              type="date"
              value={form.scan_date}
              onChange={e => handleChange('scan_date', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Core body composition */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Body Composition</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'weight_lbs', label: 'Weight (lbs)' },
                { field: 'skeletal_muscle_mass_lbs', label: 'Skeletal Muscle Mass (lbs)' },
                { field: 'body_fat_percent', label: 'Body Fat (%)' },
                { field: 'body_fat_lbs', label: 'Body Fat (lbs)' },
                { field: 'fat_free_mass_lbs', label: 'Fat-Free Mass (lbs)' },
                { field: 'dry_lean_mass_lbs', label: 'Dry Lean Mass (lbs)' },
                { field: 'bone_mass_lbs', label: 'Bone Mass (lbs)' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-zinc-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form[field as keyof typeof form]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder="—"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Body water */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Body Water</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'total_body_water_lbs', label: 'Total Body Water (lbs)' },
                { field: 'intracellular_water_lbs', label: 'Intracellular Water (lbs)' },
                { field: 'extracellular_water_lbs', label: 'Extracellular Water (lbs)' },
                { field: 'ecw_tbw_ratio', label: 'ECW/TBW Ratio' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-zinc-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form[field as keyof typeof form]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder="—"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Health indicators */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Health Indicators</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'bmi', label: 'BMI' },
                { field: 'bmr_calories', label: 'BMR (cal)' },
                { field: 'visceral_fat_level', label: 'Visceral Fat Level' },
                { field: 'inbody_score', label: 'InBody Score' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-zinc-400 text-xs mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form[field as keyof typeof form]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder="—"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any observations from this scan..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!selectedAthlete || saving}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Scan'}
          </button>

        </div>
      </div>
    </div>
  )
}