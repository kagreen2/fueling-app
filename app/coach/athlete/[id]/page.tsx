'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatGoal(goal: string | null): string {
  const map: Record<string, string> = {
    gain_lean_mass: 'Gain Lean Mass',
    lose_body_fat: 'Lose Body Fat',
    maintain_performance: 'Maintain & Perform',
    in_season_maintenance: 'In-Season Maintenance',
    recover_rebuild: 'Recover & Rebuild',
  }
  return goal ? map[goal] || goal.replace(/_/g, ' ') : 'Not set'
}

function formatSport(sport: string | null): string {
  if (!sport) return 'N/A'
  return sport.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatSeason(s: string | null): string {
  const map: Record<string, string> = {
    offseason: 'Offseason', preseason: 'Preseason', in_season: 'In-Season',
    postseason: 'Postseason', summer: 'Summer',
  }
  return s ? map[s] || s.replace(/_/g, ' ') : 'N/A'
}

interface DayData {
  date: string
  label: string
  calories: number
  protein: number
  mealCount: number
}

export default function CoachAthleteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [athlete, setAthlete] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recs, setRecs] = useState<any>(null)
  const [dailyData, setDailyData] = useState<DayData[]>([])
  const [timeRange, setTimeRange] = useState<number>(14)

  // Coach Notes state
  const [notes, setNotes] = useState<Array<{ id: string; note: string; created_at: string }>>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [notesLoading, setNotesLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Supplements state
  const [supplements, setSupplements] = useState<any[]>([])
  const [supplementsLoading, setSupplementsLoading] = useState(true)
  const [reviewingSupp, setReviewingSupp] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  // Macro override state
  const [editingMacros, setEditingMacros] = useState(false)
  const [savingMacros, setSavingMacros] = useState(false)
  const [macroForm, setMacroForm] = useState({
    daily_calories: 0,
    daily_protein_g: 0,
    daily_carbs_g: 0,
    daily_fat_g: 0,
  })

  async function saveMacroOverride() {
    setSavingMacros(true)
    const { error } = await supabase
      .from('nutrition_recommendations')
      .upsert({
        athlete_id: athleteId,
        daily_calories: macroForm.daily_calories,
        daily_protein_g: macroForm.daily_protein_g,
        daily_carbs_g: macroForm.daily_carbs_g,
        daily_fat_g: macroForm.daily_fat_g,
        reasoning: 'Manually overridden by ' + (isAdmin ? 'admin' : 'coach'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id' })

    if (!error) {
      setRecs({
        ...recs,
        daily_calories: macroForm.daily_calories,
        daily_protein_g: macroForm.daily_protein_g,
        daily_carbs_g: macroForm.daily_carbs_g,
        daily_fat_g: macroForm.daily_fat_g,
      })
      setEditingMacros(false)
    } else {
      alert('Failed to save: ' + error.message)
    }
    setSavingMacros(false)
  }

  function startEditMacros() {
    setMacroForm({
      daily_calories: recs?.daily_calories || 2500,
      daily_protein_g: recs?.daily_protein_g || 150,
      daily_carbs_g: recs?.daily_carbs_g || 300,
      daily_fat_g: recs?.daily_fat_g || 80,
    })
    setEditingMacros(true)
  }

  useEffect(() => {
    loadAthleteData()
    loadNotes()
    loadSupplements()
  }, [athleteId, timeRange])

  async function loadSupplements() {
    setSupplementsLoading(true)
    const { data } = await supabase
      .from('supplements')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
    if (data) setSupplements(data)
    setSupplementsLoading(false)
  }

  async function reviewSupplement(suppId: string, status: 'approved' | 'denied' | 'needs_info') {
    setSavingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('supplements')
      .update({
        status,
        reviewed_by: user?.id,
        reviewer_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suppId)

    if (!error) {
      setReviewingSupp(null)
      setReviewNotes('')
      loadSupplements()
    } else {
      alert('Failed to update: ' + error.message)
    }
    setSavingReview(false)
  }

  async function loadNotes() {
    setNotesLoading(true)
    const { data } = await supabase
      .from('coach_notes')
      .select('id, note, created_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setNotesLoading(false)
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('coach_notes').insert({
      coach_id: user.id,
      athlete_id: athleteId,
      note: newNote.trim(),
    })

    if (!error) {
      setNewNote('')
      loadNotes()
    }
    setSavingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('coach_notes').delete().eq('id', noteId)
    loadNotes()
  }

  function formatNoteDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  async function loadAthleteData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check if user is admin — admins can view any athlete
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminCheck = userProfile && ['admin', 'super_admin'].includes(userProfile.role)
    setIsAdmin(!!adminCheck)
    const isAdmin = adminCheck

    if (!isAdmin) {
      // Verify coach has access to this athlete (via team membership OR direct assignment)
      let hasAccess = false

      // Check team-based access
      const { data: coachTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_id', user.id)

      if (coachTeams && coachTeams.length > 0) {
        const teamIds = coachTeams.map(t => t.id)
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('athlete_id', athleteId)
          .in('team_id', teamIds)
          .limit(1)
          .single()

        if (membership) hasAccess = true
      }

      // Check direct coach assignment
      if (!hasAccess) {
        const { data: directAssignment } = await supabase
          .from('athlete_coach_assignments')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('coach_id', user.id)
          .limit(1)
          .single()

        if (directAssignment) hasAccess = true
      }

      if (!hasAccess) {
        router.push('/coach/dashboard')
        return
      }
    }

    // Get athlete data
    const { data: athleteData } = await supabase
      .from('athletes')
      .select('*, profile:profiles(full_name, email, phone, created_at)')
      .eq('id', athleteId)
      .single()

    if (!athleteData) {
      router.push('/coach/dashboard')
      return
    }

    setAthlete(athleteData)
    setProfile(athleteData.profile)

    // Get recommendations
    const { data: recsData } = await supabase
      .from('nutrition_recommendations')
      .select('*')
      .eq('athlete_id', athleteId)
      .single()

    setRecs(recsData)

    // Get meal summaries for the time range (restricted view - macros only, no meal details)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRange)

    const { data: mealSummaries } = await supabase
      .from('coach_meal_summary')
      .select('date, total_calories, total_protein, meal_count')
      .eq('athlete_id', athleteId)
      .gte('date', getLocalDateString(startDate))
      .lte('date', getLocalDateString(endDate))

    // Build daily data array (view already aggregates per day)
    const dailyMap: Record<string, { calories: number; protein: number; mealCount: number }> = {}
    for (const summary of (mealSummaries || [])) {
      dailyMap[summary.date] = {
        calories: summary.total_calories || 0,
        protein: summary.total_protein || 0,
        mealCount: summary.meal_count || 0
      }
    }

    const days: DayData[] = []
    for (let i = timeRange; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = getLocalDateString(d)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${dayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
      const data = dailyMap[dateStr] || { calories: 0, protein: 0, mealCount: 0 }
      days.push({ date: dateStr, label, ...data })
    }
    setDailyData(days)
    setLoading(false)
  }

  // Computed stats
  const stats = useMemo(() => {
    if (dailyData.length === 0) return { daysActive: 0, compliance: 0, avgCalories: 0, avgProtein: 0, streak: 0, maxCalories: 0 }
    const activeDays = dailyData.filter(d => d.mealCount > 0)
    const daysActive = activeDays.length
    const compliance = Math.round((daysActive / dailyData.length) * 100)
    const avgCalories = activeDays.length > 0 ? Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length) : 0
    const avgProtein = activeDays.length > 0 ? Math.round(activeDays.reduce((s, d) => s + d.protein, 0) / activeDays.length) : 0
    const maxCalories = Math.max(...dailyData.map(d => d.calories), 1)

    // Streak
    let streak = 0
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].mealCount > 0) streak++
      else if (i < dailyData.length - 1) break // Allow today to be empty
      else continue // Skip today if empty, check yesterday
    }

    return { daysActive, compliance, avgCalories, avgProtein, streak, maxCalories }
  }, [dailyData])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading athlete data...</p>
        </div>
      </main>
    )
  }

  const targetCal = recs?.daily_calories || 2500
  const targetPro = recs?.daily_protein_g || 150

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.push(isAdmin ? '/admin' : '/coach/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {isAdmin ? 'Back to Admin Dashboard' : 'Back to Dashboard'}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-lg font-bold flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{profile?.full_name || 'Unknown'}</h1>
              <p className="text-slate-400 text-sm">
                {formatSport(athlete?.sport)}{athlete?.position ? ` · ${athlete.position}` : ''} · {formatSeason(athlete?.season_phase)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Athlete Info Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Athlete Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Weight</p>
              <p className="text-white text-sm font-medium">{athlete?.weight_lbs ? `${athlete.weight_lbs} lbs` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Height</p>
              <p className="text-white text-sm font-medium">
                {athlete?.height_inches ? `${Math.floor(athlete.height_inches / 12)}'${athlete.height_inches % 12}"` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Goal</p>
              <p className="text-white text-sm font-medium">{formatGoal(athlete?.goal_phase)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Grade</p>
              <p className="text-white text-sm font-medium">{athlete?.grade || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Nutrition Targets */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Daily Targets</h3>
            {!editingMacros ? (
              <button
                onClick={startEditMacros}
                className="px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Edit Macros
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingMacros(false)}
                  className="px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMacroOverride}
                  disabled={savingMacros}
                  className="px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {savingMacros ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {!editingMacros ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-purple-400">{targetCal}</p>
                <p className="text-slate-500 text-xs">Calories</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-400">{recs?.daily_protein_g || 150}g</p>
                <p className="text-slate-500 text-xs">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-orange-400">{recs?.daily_carbs_g || 300}g</p>
                <p className="text-slate-500 text-xs">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{recs?.daily_fat_g || 80}g</p>
                <p className="text-slate-500 text-xs">Fat</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-slate-500 text-xs block mb-1">Calories</label>
                <input
                  type="number"
                  value={macroForm.daily_calories}
                  onChange={e => setMacroForm(prev => ({ ...prev, daily_calories: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={macroForm.daily_protein_g}
                  onChange={e => setMacroForm(prev => ({ ...prev, daily_protein_g: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={macroForm.daily_carbs_g}
                  onChange={e => setMacroForm(prev => ({ ...prev, daily_carbs_g: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Fat (g)</label>
                <input
                  type="number"
                  value={macroForm.daily_fat_g}
                  onChange={e => setMacroForm(prev => ({ ...prev, daily_fat_g: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          )}
          {recs?.reasoning && recs.reasoning.startsWith('Manually') && (
            <p className="text-xs text-yellow-400/70 mt-3 text-center">⚡ {recs.reasoning}</p>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Compliance</p>
            <p className={`text-2xl font-bold mt-1 ${
              stats.compliance >= 70 ? 'text-green-400' : stats.compliance >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>{stats.compliance}%</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Streak</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.streak} <span className="text-sm text-slate-500">days</span></p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Days Active</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.daysActive}<span className="text-sm text-slate-500">/{dailyData.length}</span></p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Calories</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.avgCalories}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Protein</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.avgProtein}g</p>
          </div>
        </div>

        {/* Daily Calorie Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Daily Calories</h3>
            <div className="flex bg-slate-700 rounded-lg p-0.5">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setTimeRange(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    timeRange === d ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-40">
            {dailyData.map((d, i) => {
              const maxVal = Math.max(stats.maxCalories, targetCal)
              const height = maxVal > 0 ? (d.calories / maxVal) * 100 : 0
              const targetLine = maxVal > 0 ? (targetCal / maxVal) * 100 : 0
              const isToday = i === dailyData.length - 1
              const hitTarget = d.calories >= targetCal * 0.8

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center relative group" style={{ minWidth: 0 }}>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {d.label}: {d.calories} cal · {d.protein}g pro · {d.mealCount} meals
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      d.mealCount === 0 ? 'bg-slate-700/50' :
                      hitTarget ? 'bg-green-500' :
                      d.calories > 0 ? 'bg-yellow-500' : 'bg-slate-700/50'
                    } ${isToday ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900' : ''}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              )
            })}
          </div>

          {/* Target line label */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Hit target (80%+)
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block" /> Below target
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-slate-700/50 inline-block" /> No logs
            </div>
          </div>
        </div>

        {/* Daily Protein Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Daily Protein</h3>
          <div className="flex items-end gap-1 h-32">
            {dailyData.map((d, i) => {
              const maxPro = Math.max(...dailyData.map(x => x.protein), targetPro)
              const height = maxPro > 0 ? (d.protein / maxPro) * 100 : 0
              const hitTarget = d.protein >= targetPro * 0.8
              const isToday = i === dailyData.length - 1

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center relative group" style={{ minWidth: 0 }}>
                  <div className="absolute bottom-full mb-2 bg-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {d.label}: {d.protein}g protein
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      d.mealCount === 0 ? 'bg-slate-700/50' :
                      hitTarget ? 'bg-blue-500' :
                      d.protein > 0 ? 'bg-blue-500/40' : 'bg-slate-700/50'
                    } ${isToday ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900' : ''}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Hit target (80%+)
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500/40 inline-block" /> Below target
            </div>
          </div>
        </div>

        {/* Daily Log History */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h3 className="text-white font-semibold">Daily Log History</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {[...dailyData].reverse().slice(0, 14).map(d => {
              const calPct = targetCal > 0 ? Math.round((d.calories / targetCal) * 100) : 0
              const proPct = targetPro > 0 ? Math.round((d.protein / targetPro) * 100) : 0
              return (
                <div key={d.date} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-white text-sm font-medium">{d.label}</p>
                    <p className="text-slate-500 text-xs">{d.mealCount} meal{d.mealCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-xs">Calories</span>
                        <span className="text-slate-300 text-xs font-mono">{d.calories}/{targetCal}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${calPct >= 80 ? 'bg-green-500' : calPct > 0 ? 'bg-yellow-500' : 'bg-slate-600'}`}
                          style={{ width: `${Math.min(calPct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-xs">Protein</span>
                        <span className="text-slate-300 text-xs font-mono">{d.protein}/{targetPro}g</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${proPct >= 80 ? 'bg-blue-500' : proPct > 0 ? 'bg-blue-500/40' : 'bg-slate-600'}`}
                          style={{ width: `${Math.min(proPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {d.mealCount > 0 ? (
                      <span className={`text-xs font-semibold ${calPct >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {calPct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Supplements Review */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💊</span>
              <h3 className="font-semibold text-white">Supplements</h3>
              {supplements.filter(s => s.status === 'pending').length > 0 && (
                <span className="bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
                  {supplements.filter(s => s.status === 'pending').length} pending
                </span>
              )}
            </div>
          </div>
          {supplementsLoading ? (
            <div className="px-5 py-8 text-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : supplements.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-slate-500 text-sm">No supplement requests from this athlete.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {supplements.map(s => {
                const statusStyles: Record<string, string> = {
                  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                  approved: 'bg-green-500/10 text-green-400 border-green-500/30',
                  denied: 'bg-red-500/10 text-red-400 border-red-500/30',
                  needs_info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                }
                const riskStyles: Record<string, string> = {
                  low: 'text-green-400',
                  moderate: 'text-yellow-400',
                  high: 'text-red-400',
                  banned: 'text-red-500 font-bold',
                }
                return (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-medium text-white">{s.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {s.brand && <span className="text-slate-400 text-xs">{s.brand}</span>}
                          {s.category && <span className="text-slate-500 text-xs capitalize">· {s.category.replace('_', ' ')}</span>}
                          {s.risk_level && <span className={`text-xs capitalize ${riskStyles[s.risk_level] || 'text-slate-400'}`}>· {s.risk_level} risk</span>}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize whitespace-nowrap ${statusStyles[s.status] || ''}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                    {s.ai_explanation && (
                      <p className="text-slate-400 text-xs leading-relaxed mb-2 bg-slate-700/30 rounded-lg p-3">
                        <span className="text-slate-500 font-medium">AI Review:</span> {s.ai_explanation}
                      </p>
                    )}
                    {s.reviewer_notes && (
                      <p className="text-slate-300 text-xs leading-relaxed mb-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                        <span className="text-purple-400 font-medium">Coach Notes:</span> {s.reviewer_notes}
                      </p>
                    )}
                    {reviewingSupp === s.id ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={reviewNotes}
                          onChange={e => setReviewNotes(e.target.value)}
                          placeholder="Add notes (optional)..."
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => reviewSupplement(s.id, 'approved')}
                            disabled={savingReview}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => reviewSupplement(s.id, 'denied')}
                            disabled={savingReview}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            ✕ Deny
                          </button>
                          <button
                            onClick={() => reviewSupplement(s.id, 'needs_info')}
                            disabled={savingReview}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            ? Need Info
                          </button>
                          <button
                            onClick={() => { setReviewingSupp(null); setReviewNotes('') }}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReviewingSupp(s.id); setReviewNotes(s.reviewer_notes || '') }}
                        className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {s.status === 'pending' ? 'Review this supplement' : 'Update review'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Coach Notes */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">          <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <h3 className="text-white font-semibold">Coach Notes</h3>
            </div>
            <span className="text-slate-500 text-xs">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Add Note Input */}
          <div className="px-5 py-4 border-b border-slate-700/50">
            <div className="flex gap-3">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a private note about this athlete..."
                rows={2}
                className="flex-1 bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600 placeholder-slate-500 resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    addNote()
                  }
                }}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim() || savingNote}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors self-end"
              >
                {savingNote ? 'Saving...' : 'Add Note'}
              </button>
            </div>
            <p className="text-slate-600 text-xs mt-1.5">Press Cmd+Enter to save. Notes are private — only you can see them.</p>
          </div>

          {/* Notes List */}
          {notesLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-500 text-sm">No notes yet. Add your first note above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {notes.map(n => (
                <div key={n.id} className="px-5 py-3 group hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm whitespace-pre-wrap">{n.note}</p>
                      <p className="text-slate-500 text-xs mt-1">{formatNoteDate(n.created_at)}</p>
                    </div>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                      title="Delete note"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
