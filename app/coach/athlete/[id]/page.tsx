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

  useEffect(() => {
    loadAthleteData()
  }, [athleteId, timeRange])

  async function loadAthleteData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Verify coach has access to this athlete (via team membership)
    const { data: coachTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_id', user.id)

    if (!coachTeams || coachTeams.length === 0) {
      router.push('/coach/dashboard')
      return
    }

    const teamIds = coachTeams.map(t => t.id)
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('athlete_id', athleteId)
      .in('team_id', teamIds)
      .limit(1)
      .single()

    if (!membership) {
      router.push('/coach/dashboard')
      return
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
            onClick={() => router.push('/coach/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
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
          <h3 className="text-white font-semibold mb-3">Daily Targets</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{targetCal}</p>
              <p className="text-slate-500 text-xs">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{recs?.daily_protein_g || 150}g</p>
              <p className="text-slate-500 text-xs">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{recs?.daily_carbs_g || 300}g</p>
              <p className="text-slate-500 text-xs">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{recs?.daily_fat_g || 80}g</p>
              <p className="text-slate-500 text-xs">Fat</p>
            </div>
          </div>
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
      </div>
    </main>
  )
}
