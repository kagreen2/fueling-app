'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LibrarySupplement {
  id: string
  name: string
  brand: string
  category: string
  default_description: string
  thorne_product_url: string | null
  nsf_certified: boolean
}

interface Team {
  id: string
  name: string
}

interface AthleteOption {
  id: string
  name: string
  teamId: string
  teamName: string
}

interface Recommendation {
  id: string
  supplement_library_id: string | null
  custom_name: string | null
  coach_note: string | null
  priority: string
  timing: string | null
  thorne_product_url: string | null
  is_active: boolean
  athlete_id: string | null
  team_id: string | null
  created_at: string
  supplement_name?: string
  supplement_category?: string
}

interface AthleteStatus {
  athlete_id: string
  athlete_name: string
  team_name: string
  recommendation_id: string
  supplement_name: string
  is_taking: boolean
  priority: string
}

const THORNE_DISPENSARY = 'https://www.thorne.com/u/IronFlagAthlete'

const CATEGORIES = [
  'All', 'Sports Performance', 'Recovery', 'Protein', 'Multivitamin',
  'Vitamins', 'Minerals', 'Fish Oil & Omegas', 'Gut Health', 'Sleep', 'Stacks'
]

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  essential: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Essential' },
  recommended: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Recommended' },
  optional: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Optional' },
}

export default function CoachSupplementsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'library' | 'recommend' | 'visibility'>('library')
  const [library, setLibrary] = useState<LibrarySupplement[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [athleteStatuses, setAthleteStatuses] = useState<AthleteStatus[]>([])
  const [coachUserId, setCoachUserId] = useState<string>('')

  // Library state
  const [searchLib, setSearchLib] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Recommend form state
  const [selectedSupplement, setSelectedSupplement] = useState<LibrarySupplement | null>(null)
  const [recTarget, setRecTarget] = useState<'athlete' | 'team'>('athlete')
  const [recAthleteId, setRecAthleteId] = useState('')
  const [recTeamId, setRecTeamId] = useState('')
  const [recNote, setRecNote] = useState('')
  const [recPriority, setRecPriority] = useState<'essential' | 'recommended' | 'optional'>('recommended')
  const [recTiming, setRecTiming] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Visibility state
  const [visibilityFilter, setVisibilityFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCoachUserId(user.id)

    // Verify coach role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.role)) {
      router.push('/login')
      return
    }

    // Load supplement library
    const { data: libData } = await supabase
      .from('supplement_library')
      .select('*')
      .order('category', { ascending: true })
    if (libData) setLibrary(libData)

    // Load coach's teams
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('coach_id', user.id)
      .order('name')
    if (teamData) setTeams(teamData)

    // Load athletes from coach's teams
    if (teamData && teamData.length > 0) {
      const teamIds = teamData.map(t => t.id)
      const { data: members } = await supabase
        .from('team_members')
        .select('team_id, athlete_id')
        .in('team_id', teamIds)

      if (members && members.length > 0) {
        const athleteIds = [...new Set(members.map(m => m.athlete_id))]
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id, profile:profiles!athletes_profile_id_fkey(full_name)')
          .in('id', athleteIds)

        if (athleteData) {
          const athleteOptions: AthleteOption[] = athleteData.map(a => {
            const membership = members.find(m => m.athlete_id === a.id)
            const team = teamData.find(t => t.id === membership?.team_id)
            return {
              id: a.id,
              name: (a.profile as any)?.full_name || 'Unknown',
              teamId: team?.id || '',
              teamName: team?.name || '',
            }
          }).sort((a, b) => a.name.localeCompare(b.name))
          setAthletes(athleteOptions)
        }
      }
    }

    // Load existing recommendations by this coach
    const { data: recData } = await supabase
      .from('supplement_recommendations')
      .select('*')
      .eq('coach_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (recData) {
      // Enrich with supplement names
      const enriched = recData.map(r => ({
        ...r,
        supplement_name: r.supplement_library_id
          ? libData?.find(l => l.id === r.supplement_library_id)?.name || r.custom_name || 'Unknown'
          : r.custom_name || 'Unknown',
        supplement_category: r.supplement_library_id
          ? libData?.find(l => l.id === r.supplement_library_id)?.category || ''
          : '',
      }))
      setRecommendations(enriched)
    }

    // Load athlete statuses for visibility
    const { data: statusData } = await supabase
      .from('athlete_supplement_status')
      .select('*')

    if (statusData && recData) {
      // Build visibility data
      const statuses: AthleteStatus[] = []
      for (const rec of recData) {
        if (rec.athlete_id) {
          // Direct athlete recommendation
          const athlete = athletes.length > 0
            ? athletes.find(a => a.id === rec.athlete_id)
            : null
          const status = statusData.find(s => s.recommendation_id === rec.id && s.athlete_id === rec.athlete_id)
          const suppName = rec.supplement_library_id
            ? libData?.find(l => l.id === rec.supplement_library_id)?.name || rec.custom_name || 'Unknown'
            : rec.custom_name || 'Unknown'
          statuses.push({
            athlete_id: rec.athlete_id,
            athlete_name: athlete?.name || 'Loading...',
            team_name: athlete?.teamName || '',
            recommendation_id: rec.id,
            supplement_name: suppName,
            is_taking: status?.is_taking || false,
            priority: rec.priority,
          })
        }
      }
      setAthleteStatuses(statuses)
    }

    setLoading(false)
  }

  // Reload visibility data after athletes are loaded
  useEffect(() => {
    if (athletes.length > 0 && recommendations.length > 0) {
      loadVisibility()
    }
  }, [athletes, recommendations])

  async function loadVisibility() {
    const { data: statusData } = await supabase
      .from('athlete_supplement_status')
      .select('*')

    const statuses: AthleteStatus[] = []
    for (const rec of recommendations) {
      if (rec.athlete_id) {
        const athlete = athletes.find(a => a.id === rec.athlete_id)
        const status = statusData?.find(s => s.recommendation_id === rec.id && s.athlete_id === rec.athlete_id)
        statuses.push({
          athlete_id: rec.athlete_id,
          athlete_name: athlete?.name || 'Unknown',
          team_name: athlete?.teamName || '',
          recommendation_id: rec.id,
          supplement_name: rec.supplement_name || 'Unknown',
          is_taking: status?.is_taking || false,
          priority: rec.priority,
        })
      }
      if (rec.team_id) {
        // For team recommendations, show each athlete on that team
        const teamAthletes = athletes.filter(a => a.teamId === rec.team_id)
        for (const athlete of teamAthletes) {
          const status = statusData?.find(s => s.recommendation_id === rec.id && s.athlete_id === athlete.id)
          statuses.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: athlete.teamName,
            recommendation_id: rec.id,
            supplement_name: rec.supplement_name || 'Unknown',
            is_taking: status?.is_taking || false,
            priority: rec.priority,
          })
        }
      }
    }
    setAthleteStatuses(statuses)
  }

  const filteredLibrary = useMemo(() => {
    return library.filter(s => {
      const matchesSearch = !searchLib || s.name.toLowerCase().includes(searchLib.toLowerCase()) || s.category.toLowerCase().includes(searchLib.toLowerCase())
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [library, searchLib, categoryFilter])

  async function submitRecommendation() {
    if (!selectedSupplement) return
    if (recTarget === 'athlete' && !recAthleteId) return
    if (recTarget === 'team' && !recTeamId) return

    setSaving(true)
    const { error } = await supabase.from('supplement_recommendations').insert({
      supplement_library_id: selectedSupplement.id,
      coach_id: coachUserId,
      athlete_id: recTarget === 'athlete' ? recAthleteId : null,
      team_id: recTarget === 'team' ? recTeamId : null,
      coach_note: recNote || null,
      priority: recPriority,
      timing: recTiming || null,
      thorne_product_url: selectedSupplement.thorne_product_url,
    })

    if (!error) {
      setSaveSuccess(true)
      setSelectedSupplement(null)
      setRecNote('')
      setRecTiming('')
      setRecAthleteId('')
      setRecTeamId('')
      setRecPriority('recommended')
      loadData()
      setTimeout(() => setSaveSuccess(false), 2000)
    }
    setSaving(false)
  }

  async function deactivateRecommendation(id: string) {
    await supabase
      .from('supplement_recommendations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    loadData()
  }

  // Visibility stats
  const visibilityStats = useMemo(() => {
    const total = athleteStatuses.length
    const taking = athleteStatuses.filter(s => s.is_taking).length
    const notTaking = total - taking
    return { total, taking, notTaking }
  }, [athleteStatuses])

  const filteredStatuses = useMemo(() => {
    if (visibilityFilter === 'all') return athleteStatuses
    if (visibilityFilter === 'taking') return athleteStatuses.filter(s => s.is_taking)
    if (visibilityFilter === 'not_taking') return athleteStatuses.filter(s => !s.is_taking)
    return athleteStatuses
  }, [athleteStatuses, visibilityFilter])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
              onClick={() => router.push('/coach/dashboard')}
              className="text-slate-400 hover:text-white transition-colors text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold">Supplement Management</h1>
              <p className="text-xs text-slate-400">Recommend supplements · Track compliance</p>
            </div>
          </div>
          <a
            href={THORNE_DISPENSARY}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🛒 Thorne Dispensary
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 mb-6">
          {[
            { key: 'library', label: '📚 Library' },
            { key: 'recommend', label: `💊 Recommend${saveSuccess ? ' ✅' : ''}` },
            { key: 'visibility', label: `👁 Visibility (${visibilityStats.taking}/${visibilityStats.total})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t.key
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">

        {/* ========== LIBRARY TAB ========== */}
        {tab === 'library' && (
          <div>
            {/* Search & Filter */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={searchLib}
                onChange={e => setSearchLib(e.target.value)}
                placeholder="Search supplements..."
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-600"
              />
            </div>
            <div className="flex gap-2 flex-wrap mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Library Grid */}
            <div className="grid gap-3">
              {filteredLibrary.map(supp => (
                <div
                  key={supp.id}
                  className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{supp.name}</h3>
                        {supp.nsf_certified && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                            NSF Sport
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-400 mb-2">{supp.category}</p>
                      <p className="text-sm text-slate-400 leading-relaxed">{supp.default_description}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedSupplement(supp)
                          setTab('recommend')
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors"
                      >
                        Recommend
                      </button>
                      {supp.thorne_product_url && (
                        <a
                          href={supp.thorne_product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-600 rounded-lg hover:text-white hover:border-slate-500 transition-colors text-center"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">No supplements match your search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== RECOMMEND TAB ========== */}
        {tab === 'recommend' && (
          <div className="space-y-6">
            {/* Selected Supplement */}
            {selectedSupplement ? (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">{selectedSupplement.name}</h3>
                    <p className="text-xs text-purple-400">{selectedSupplement.category}</p>
                  </div>
                  <button
                    onClick={() => setSelectedSupplement(null)}
                    className="text-slate-500 hover:text-white text-sm"
                  >
                    Change
                  </button>
                </div>
                <p className="text-sm text-slate-400">{selectedSupplement.default_description}</p>
              </div>
            ) : (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-center">
                <p className="text-slate-400 mb-3">Select a supplement from the library first</p>
                <button
                  onClick={() => setTab('library')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Browse Library
                </button>
              </div>
            )}

            {selectedSupplement && (
              <>
                {/* Target Selection */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Assign To</label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setRecTarget('athlete')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        recTarget === 'athlete'
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
                      }`}
                    >
                      Individual Athlete
                    </button>
                    <button
                      onClick={() => setRecTarget('team')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        recTarget === 'team'
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
                      }`}
                    >
                      Entire Team
                    </button>
                  </div>

                  {recTarget === 'athlete' ? (
                    <select
                      value={recAthleteId}
                      onChange={e => setRecAthleteId(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
                    >
                      <option value="">Select an athlete...</option>
                      {athletes.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.teamName})</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={recTeamId}
                      onChange={e => setRecTeamId(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
                    >
                      <option value="">Select a team...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Priority */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <label className="text-sm font-medium text-slate-300 mb-3 block">Priority</label>
                  <div className="flex gap-2">
                    {(['essential', 'recommended', 'optional'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setRecPriority(p)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          recPriority === p
                            ? `${PRIORITY_STYLES[p].bg} ${PRIORITY_STYLES[p].text} border-current`
                            : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
                        }`}
                      >
                        {PRIORITY_STYLES[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timing */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Timing Guidance <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={recTiming}
                    onChange={e => setRecTiming(e.target.value)}
                    placeholder="e.g., Take with breakfast, Post-workout, Before bed"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-600"
                  />
                </div>

                {/* Coach Note */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Note for Athlete <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={recNote}
                    onChange={e => setRecNote(e.target.value)}
                    placeholder="Why you're recommending this, dosage notes, etc."
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-600 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submitRecommendation}
                  disabled={saving || (recTarget === 'athlete' && !recAthleteId) || (recTarget === 'team' && !recTeamId)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    saving
                      ? 'bg-slate-700 text-slate-400 cursor-wait'
                      : saveSuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saveSuccess ? '✅ Recommendation Sent!' : saving ? 'Saving...' : 'Send Recommendation'}
                </button>
              </>
            )}

            {/* Active Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Active Recommendations ({recommendations.length})
                </h3>
                <div className="space-y-2">
                  {recommendations.map(rec => {
                    const target = rec.athlete_id
                      ? athletes.find(a => a.id === rec.athlete_id)?.name || 'Unknown athlete'
                      : teams.find(t => t.id === rec.team_id)?.name || 'Unknown team'
                    const targetIcon = rec.athlete_id ? '👤' : '👥'
                    const ps = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.recommended

                    return (
                      <div key={rec.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-white">{rec.supplement_name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps.bg} ${ps.text}`}>
                              {ps.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {targetIcon} {target}
                            {rec.timing && <span className="ml-2">· ⏰ {rec.timing}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => deactivateRecommendation(rec.id)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1"
                          title="Remove recommendation"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== VISIBILITY TAB ========== */}
        {tab === 'visibility' && (
          <div>
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{visibilityStats.total}</p>
                <p className="text-xs text-slate-500">Total Assigned</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{visibilityStats.taking}</p>
                <p className="text-xs text-green-500">Taking</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-400">{visibilityStats.notTaking}</p>
                <p className="text-xs text-slate-500">Not Yet</p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'all', label: 'All' },
                { key: 'taking', label: 'Taking' },
                { key: 'not_taking', label: 'Not Taking' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setVisibilityFilter(f.key)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    visibilityFilter === f.key
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status List */}
            {filteredStatuses.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-500">
                  {athleteStatuses.length === 0
                    ? 'No supplement recommendations sent yet. Go to the Recommend tab to get started.'
                    : 'No results match this filter.'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-700 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <div className="col-span-3">Athlete</div>
                  <div className="col-span-2">Team</div>
                  <div className="col-span-3">Supplement</div>
                  <div className="col-span-2">Priority</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {filteredStatuses.map((s, i) => {
                    const ps = PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.recommended
                    return (
                      <div
                        key={`${s.recommendation_id}-${s.athlete_id}-${i}`}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/80 transition-colors cursor-pointer"
                        onClick={() => router.push(`/coach/athlete/${s.athlete_id}`)}
                      >
                        <div className="col-span-3 text-sm text-white font-medium truncate">{s.athlete_name}</div>
                        <div className="col-span-2 text-xs text-slate-500 truncate">{s.team_name}</div>
                        <div className="col-span-3 text-sm text-slate-300 truncate">{s.supplement_name}</div>
                        <div className="col-span-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps.bg} ${ps.text}`}>
                            {ps.label}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          {s.is_taking ? (
                            <span className="text-xs font-semibold text-green-400 bg-green-500/15 px-2 py-1 rounded">Taking</span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-2 py-1 rounded">Not yet</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
