'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'

interface Supplement {
  id: string
  name: string
  brand?: string
  category?: string
  status: string
  risk_level: string
  ai_explanation?: string
  reviewer_notes?: string
}

interface CoachRecommendation {
  id: string
  supplement_library_id: string | null
  custom_name: string | null
  coach_note: string | null
  priority: 'essential' | 'recommended' | 'optional'
  timing: string | null
  thorne_product_url: string | null
  is_active: boolean
  athlete_id: string | null
  team_id: string | null
  created_at: string
  // Joined data
  supplement_name: string
  supplement_description: string
  nsf_certified: boolean
  coach_name: string
  // Status
  is_taking: boolean
  status_id: string | null
}

const SUPPLEMENT_CATEGORIES = [
  { value: 'protein', label: 'Protein' },
  { value: 'creatine', label: 'Creatine' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'vitamins', label: 'Vitamins / Minerals' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'weight_gainer', label: 'Weight Gainer' },
  { value: 'fat_burner', label: 'Fat Burner' },
  { value: 'other', label: 'Other' },
]

const THORNE_DISPENSARY = 'https://www.thorne.com/u/IronFlagAthlete'

const PRIORITY_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  essential: { icon: '🔴', label: 'Essential', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  recommended: { icon: '🟣', label: 'Recommended', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  optional: { icon: '⚪', label: 'Optional', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
}

export default function SupplementsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [recommendations, setRecommendations] = useState<CoachRecommendation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'recommended' | 'my_supplements'>('recommended')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) { setLoading(false); return }
    setAthleteId(athlete.id)

    // Load existing safety-reviewed supplements
    const { data: suppData } = await supabase
      .from('supplements')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false })
    if (suppData) setSupplements(suppData)

    // Load coach recommendations (direct to athlete)
    const { data: directRecs } = await supabase
      .from('supplement_recommendations')
      .select('*')
      .eq('athlete_id', athlete.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Load team-level recommendations
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('athlete_id', athlete.id)

    let teamRecs: any[] = []
    if (teamMemberships && teamMemberships.length > 0) {
      const teamIds = teamMemberships.map(m => m.team_id)
      const { data: tRecs } = await supabase
        .from('supplement_recommendations')
        .select('*')
        .in('team_id', teamIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (tRecs) teamRecs = tRecs
    }

    const allRecs = [...(directRecs || []), ...teamRecs]

    // Enrich with supplement library data and coach names
    if (allRecs.length > 0) {
      const libIds = allRecs.filter(r => r.supplement_library_id).map(r => r.supplement_library_id)
      const coachIds = [...new Set(allRecs.map(r => r.coach_id))]

      const [libResult, coachResult, statusResult] = await Promise.all([
        libIds.length > 0
          ? supabase.from('supplement_library').select('*').in('id', libIds)
          : { data: [] },
        supabase.from('profiles').select('id, full_name').in('id', coachIds),
        supabase.from('athlete_supplement_status').select('*').eq('athlete_id', athlete.id),
      ])

      const libMap = new Map((libResult.data || []).map(l => [l.id, l]))
      const coachMap = new Map((coachResult.data || []).map(c => [c.id, c]))
      const statusMap = new Map((statusResult.data || []).map(s => [s.recommendation_id, s]))

      const enriched: CoachRecommendation[] = allRecs.map(r => {
        const lib = r.supplement_library_id ? libMap.get(r.supplement_library_id) : null
        const coach = coachMap.get(r.coach_id)
        const status = statusMap.get(r.id)
        return {
          ...r,
          supplement_name: lib?.name || r.custom_name || 'Unknown',
          supplement_description: lib?.default_description || '',
          nsf_certified: lib?.nsf_certified || false,
          coach_name: coach?.full_name || 'Your Coach',
          is_taking: status?.is_taking || false,
          status_id: status?.id || null,
        }
      })

      // Deduplicate by supplement_library_id (team + direct could overlap)
      const seen = new Set<string>()
      const deduped = enriched.filter(r => {
        const key = r.supplement_library_id || r.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      setRecommendations(deduped)
    }

    setLoading(false)
  }

  async function toggleTaking(rec: CoachRecommendation) {
    if (!athleteId) return
    setTogglingId(rec.id)

    const newStatus = !rec.is_taking

    if (rec.status_id) {
      // Update existing status
      await supabase
        .from('athlete_supplement_status')
        .update({
          is_taking: newStatus,
          started_at: newStatus ? new Date().toISOString() : null,
          stopped_at: newStatus ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rec.status_id)
    } else {
      // Create new status
      await supabase.from('athlete_supplement_status').insert({
        recommendation_id: rec.id,
        athlete_id: athleteId,
        is_taking: newStatus,
        started_at: newStatus ? new Date().toISOString() : null,
      })
    }

    // Update local state
    setRecommendations(prev =>
      prev.map(r => r.id === rec.id ? { ...r, is_taking: newStatus } : r)
    )
    setTogglingId(null)
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setAnalysis(null)
  }

  async function analyzeSupplements() {
    if (!form.name) {
      setError('Please enter a supplement name')
      return
    }

    setAnalyzing(true)
    setError('')

    try {
      const res = await fetch('/api/supplements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setAnalyzing(false)
        return
      }

      setAnalysis(data)
    } catch {
      setError('Analysis failed. Please try again.')
    }

    setAnalyzing(false)
  }

  async function handleSubmit() {
    if (!form.name) {
      setError('Please enter a supplement name')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) {
      setLoading(false)
      return
    }

    await supabase.from('supplements').insert({
      athlete_id: athlete.id,
      name: form.name,
      brand: form.brand || null,
      category: form.category || null,
      risk_level: analysis?.riskLevel || 'low',
      status: 'pending',
      ai_explanation: analysis?.explanation || null,
    })

    setForm({ name: '', brand: '', category: '' })
    setAnalysis(null)
    setShowForm(false)
    setLoading(false)
    loadAll()
  }

  const statusStyles: any = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    denied: 'bg-red-500/10 text-red-400 border-red-500/20',
    needs_info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  const riskStyles: any = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-red-400',
    banned: 'text-red-500 font-bold',
  }

  // Group recommendations by priority
  const essentialRecs = recommendations.filter(r => r.priority === 'essential')
  const recommendedRecs = recommendations.filter(r => r.priority === 'recommended')
  const optionalRecs = recommendations.filter(r => r.priority === 'optional')

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/athlete/dashboard')}
              className="text-slate-400 hover:text-white transition-colors text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">Supplements</h1>
              <p className="text-xs text-slate-400">Coach recommendations & safety reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Thorne Banner */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <a
          href={THORNE_DISPENSARY}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-semibold text-sm">Shop Thorne Supplements</p>
              <p className="text-green-300/70 text-xs mt-0.5">10-15% off with our team dispensary link</p>
            </div>
            <span className="text-green-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'recommended'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Coach Picks {recommendations.length > 0 && `(${recommendations.length})`}
          </button>
          <button
            onClick={() => setActiveTab('my_supplements')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'my_supplements'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Safety Reviews {supplements.filter(s => s.status === 'pending').length > 0 && `(${supplements.filter(s => s.status === 'pending').length} pending)`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pb-20">

        {/* ========== COACH RECOMMENDATIONS TAB ========== */}
        {activeTab === 'recommended' && (
          <div>
            {recommendations.length === 0 ? (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">💊</div>
                    <p className="text-slate-400 font-medium">No supplement recommendations yet</p>
                    <p className="text-slate-500 text-sm mt-2">
                      Your coach will add recommendations here when they have suggestions for you.
                    </p>
                    <a
                      href={THORNE_DISPENSARY}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Browse Thorne Dispensary →
                    </a>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Render by priority group */}
                {[
                  { recs: essentialRecs, priority: 'essential' },
                  { recs: recommendedRecs, priority: 'recommended' },
                  { recs: optionalRecs, priority: 'optional' },
                ].filter(g => g.recs.length > 0).map(group => {
                  const config = PRIORITY_CONFIG[group.priority]
                  return (
                    <div key={group.priority}>
                      <div className="flex items-center gap-2 mb-3">
                        <span>{config.icon}</span>
                        <h3 className={`text-sm font-semibold uppercase tracking-wider ${config.text}`}>
                          {config.label}
                        </h3>
                        <span className="text-xs text-slate-600">({group.recs.length})</span>
                      </div>
                      <div className="space-y-3">
                        {group.recs.map(rec => (
                          <div
                            key={rec.id}
                            className={`${config.bg} border ${config.border} rounded-xl p-4 transition-all`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-white">{rec.supplement_name}</h4>
                                  {rec.nsf_certified && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                                      NSF
                                    </span>
                                  )}
                                </div>
                                {rec.timing && (
                                  <p className="text-xs text-slate-500 mt-0.5">⏰ {rec.timing}</p>
                                )}
                              </div>
                              {/* Taking toggle */}
                              <button
                                onClick={() => toggleTaking(rec)}
                                disabled={togglingId === rec.id}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                                  rec.is_taking
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                    : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:text-white hover:border-slate-500'
                                }`}
                              >
                                {togglingId === rec.id ? '...' : rec.is_taking ? '✅ Taking' : 'Not Taking'}
                              </button>
                            </div>

                            {/* Description */}
                            {rec.supplement_description && (
                              <p className="text-sm text-slate-400 leading-relaxed mb-2">
                                {rec.supplement_description}
                              </p>
                            )}

                            {/* Coach Note */}
                            {rec.coach_note && (
                              <div className="bg-slate-800/50 rounded-lg p-3 mb-2">
                                <p className="text-xs text-slate-500 font-medium mb-1">From {rec.coach_name}:</p>
                                <p className="text-sm text-slate-300">{rec.coach_note}</p>
                              </div>
                            )}

                            {/* Thorne Link */}
                            {rec.thorne_product_url && (
                              <a
                                href={rec.thorne_product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-medium transition-colors mt-1"
                              >
                                🛒 Order on Thorne →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== SAFETY REVIEWS TAB ========== */}
        {activeTab === 'my_supplements' && (
          <div>
            {/* Add Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                + Request Review
              </button>
            </div>

            {/* Add Form */}
            {showForm && (
              <Card className="mb-6">
                <CardHeader title="New Supplement Review" />
                <CardContent>
                  <div className="space-y-4 mb-4">
                    <Input
                      label="Supplement Name"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="e.g. Creatine Monohydrate"
                    />
                    <Input
                      label="Brand (optional)"
                      value={form.brand}
                      onChange={e => update('brand', e.target.value)}
                      placeholder="e.g. Optimum Nutrition"
                    />
                    <Select
                      label="Category"
                      value={form.category}
                      onChange={e => update('category', e.target.value)}
                      options={SUPPLEMENT_CATEGORIES}
                    />
                  </div>

                  {error && (
                    <Card className="mb-4 bg-red-500/10 border-red-500/20">
                      <CardContent>
                        <p className="text-sm text-red-400">{error}</p>
                      </CardContent>
                    </Card>
                  )}

                  {analysis && (
                    <Card className={`mb-4 ${
                      analysis.riskLevel === 'low' ? 'bg-green-500/10 border-green-500/20' :
                      analysis.riskLevel === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/20' :
                      'bg-red-500/10 border-red-500/20'
                    }`}>
                      <CardHeader
                        title="AI Safety Review"
                        action={
                          <span className={`text-xs font-bold uppercase ${riskStyles[analysis.riskLevel]}`}>
                            {analysis.riskLevel} risk
                          </span>
                        }
                      />
                      <CardContent>
                        <p className="text-sm text-slate-300 leading-relaxed mb-3">
                          {analysis.explanation}
                        </p>
                        {analysis.requiresParentApproval && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                            <p className="text-yellow-400 text-xs font-medium">
                              ⚠️ Parent/guardian approval required
                            </p>
                          </div>
                        )}
                        {analysis.bannedWarning && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-red-400 text-xs font-medium">
                              🚫 {analysis.bannedWarning}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    {!analysis ? (
                      <Button
                        onClick={analyzeSupplements}
                        isLoading={analyzing}
                        disabled={analyzing || !form.name}
                        variant="secondary"
                        size="lg"
                      >
                        {analyzing ? 'Analyzing...' : 'AI Safety Check'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        isLoading={loading}
                        disabled={loading || analysis.riskLevel === 'banned'}
                        size="lg"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        {loading ? 'Submitting...' : analysis.riskLevel === 'banned' ? 'Cannot submit — banned substance' : 'Submit for approval'}
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setShowForm(false)
                        setAnalysis(null)
                        setError('')
                      }}
                      variant="secondary"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supplements List */}
            {supplements.length === 0 && !showForm ? (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🔬</div>
                    <p className="text-slate-400 font-medium">No supplement reviews yet</p>
                    <p className="text-slate-500 text-sm mt-2">
                      Taking a supplement not recommended by your coach? Submit it for an AI safety review.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {supplements.map(s => (
                  <Card key={s.id}>
                    <CardContent>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{s.name}</h3>
                          {s.brand && (
                            <p className="text-slate-400 text-sm">{s.brand}</p>
                          )}
                          {s.category && (
                            <p className="text-slate-500 text-xs mt-1 capitalize">
                              {s.category.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusStyles[s.status]}`}>
                            {s.status.replace('_', ' ')}
                          </span>
                          {s.risk_level && (
                            <span className={`text-xs capitalize ${riskStyles[s.risk_level]}`}>
                              {s.risk_level} risk
                            </span>
                          )}
                        </div>
                      </div>
                      {s.ai_explanation && (
                        <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-3">
                          {s.ai_explanation}
                        </p>
                      )}
                      {s.reviewer_notes && (
                        <div className="mt-3 bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 font-medium mb-1">Coach notes:</p>
                          <p className="text-xs text-slate-300">{s.reviewer_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
