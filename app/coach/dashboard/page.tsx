'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WellnessSpotlight from '@/components/WellnessSpotlight'
import { getZoneInfo } from '@/lib/fuel-score'

interface Team {
  id: string
  name: string
  sport: string | null
  invite_code: string
}

interface AthleteRow {
  athlete_id: string
  team_id: string
  athlete: {
    id: string
    profile_id: string
    sport: string | null
    position: string | null
    weight_lbs: number | null
    goal_phase: string | null
    season_phase: string | null
    user_type: string | null
    activity_level: string | null
    training_style: string | null
    profile: {
      full_name: string
      email: string
    }
  }
}

interface MealSummary {
  athlete_id: string
  date: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  meal_count: number
}

interface Recommendation {
  athlete_id: string
  daily_calories: number
  daily_protein_g: number
}

interface WellnessCheckin {
  athlete_id: string
  date: string
  energy: number
  stress: number
  soreness: number
  hydration: number
  sleep_hours: number
  training_type: string | null
  wellness_score: number
}

interface AthleteData {
  id: string
  profileId: string
  name: string
  email: string
  sport: string | null
  position: string | null
  weight: number | null
  goal: string | null
  season: string | null
  userType: string | null
  activityLevel: string | null
  trainingStyle: string | null
  teamId: string
  teamName: string
  todayCalories: number
  todayProtein: number
  targetCalories: number
  targetProtein: number
  loggedToday: boolean
  daysActive: number
  totalDays: number
  complianceRate: number
  streak: number
  lastLogDate: string | null
  daysSinceLastLog: number
  trend: 'up' | 'down' | 'stable'
  // Wellness fields
  wellnessScore: number | null
  wellnessLabel: string | null
  checkinStreak: number
  wellnessDate: string | null
  wellnessDaysAgo: number | null
  recentCheckins: WellnessCheckin[]
}

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

function formatTrainingStyle(style: string | null): string {
  if (!style) return 'General'
  const map: Record<string, string> = {
    strength: 'Strength',
    crossfit: 'CrossFit',
    cardio: 'Cardio',
    mixed: 'Mixed',
    yoga_pilates: 'Yoga/Pilates',
    dance: 'Dance',
  }
  // Handle comma-separated multi-select values
  const styles = style.split(',').map(s => s.trim()).filter(Boolean)
  const formatted = styles.map(s => map[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  return formatted.join(' + ') || 'General'
}

function formatUserContext(a: AthleteData): string {
  if (a.userType === 'member') {
    return formatTrainingStyle(a.trainingStyle)
  }
  return `${formatSport(a.sport)}${a.position ? ` · ${a.position}` : ''}`
}

function getUserTypeBadge(userType: string | null): { label: string; color: string } {
  if (userType === 'member') return { label: 'General Fitness', color: 'bg-blue-500/20 text-blue-400' }
  return { label: 'Athlete', color: 'bg-purple-500/20 text-purple-400' }
}

function getWellnessColor(score: number | null): string {
  if (score === null) return 'text-slate-500'
  return getZoneInfo(score).color
}

function getWellnessBgColor(score: number | null): string {
  if (score === null) return 'bg-slate-500/10'
  const zone = getZoneInfo(score)
  // Convert text color to bg with opacity
  if (zone.color.includes('green')) return 'bg-green-500/10'
  if (zone.color.includes('blue')) return 'bg-blue-500/10'
  if (zone.color.includes('amber')) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

export default function CoachDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [athletes, setAthletes] = useState<AthleteData[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<number>(7)
  const [view, setView] = useState<'overview' | 'leaderboard' | 'alerts' | 'messages'>('overview')
  const [coachName, setCoachName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingSupplements, setPendingSupplements] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState<Array<{
    id: string
    sender_id: string
    receiver_id: string
    athlete_id: string
    message: string
    read: boolean
    created_at: string
    sender_name?: string
    sender_email?: string
  }>>([])
  const [coachUserId, setCoachUserId] = useState<string>('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [dismissedCoachAlerts, setDismissedCoachAlerts] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('coach_dismissed_alerts')
        if (saved) return new Set(JSON.parse(saved))
      } catch {}
    }
    return new Set()
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Get coach profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'coach' && profile.role !== 'super_admin' && profile.role !== 'admin')) {
      router.push('/login')
      return
    }
    const adminAccess = profile.role === 'super_admin' || profile.role === 'admin'
    setIsAdmin(adminAccess)
    setCoachName(profile.full_name || 'Coach')
    setCoachUserId(user.id)

    // Get teams — admins see ALL teams, coaches see only their own
    let teamsQuery = supabase.from('teams').select('id, name, sport, invite_code')
    if (!adminAccess) {
      teamsQuery = teamsQuery.eq('coach_id', user.id)
    }
    const { data: teamsData } = await teamsQuery

    setTeams(teamsData || [])

    const teamIds = (teamsData || []).map(t => t.id)
    const teamMap = Object.fromEntries((teamsData || []).map(t => [t.id, t.name]))

    // Get team members with athlete + profile data
    let members: any[] = []
    if (teamIds.length > 0) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          athlete_id,
          team_id,
          athlete:athletes(
            id,
            profile_id,
            sport,
            position,
            weight_lbs,
            goal_phase,
            season_phase,
            user_type,
            activity_level,
            training_style,
            profile:profiles(full_name, email)
          )
        `)
        .in('team_id', teamIds)
      members = teamMembers || []
    }

    // Also get directly assigned athletes via athlete_coach_assignments
    let assignmentsQuery = supabase
      .from('athlete_coach_assignments')
      .select(`
        athlete_id,
        athlete:athletes(
          id,
          profile_id,
          sport,
          position,
          weight_lbs,
          goal_phase,
          season_phase,
          user_type,
          activity_level,
          training_style,
          profile:profiles(full_name, email)
        )
      `)
    if (!adminAccess) {
      assignmentsQuery = assignmentsQuery.eq('coach_id', user.id)
    }
    const { data: directAssignments } = await assignmentsQuery

    // Merge direct assignments into members list (avoid duplicates)
    const existingAthleteIds = new Set(members.map(m => m.athlete_id))
    if (directAssignments) {
      for (const da of directAssignments) {
        if (!existingAthleteIds.has(da.athlete_id)) {
          members.push({
            athlete_id: da.athlete_id,
            team_id: 'direct_assignment',
            athlete: da.athlete,
          })
          existingAthleteIds.add(da.athlete_id)
        }
      }
    }

    // Add 'Direct' to team map for directly assigned athletes
    teamMap['direct_assignment'] = 'Direct Assignment'

    if (members.length === 0) {
      setAthletes([])
      setLoading(false)
      return
    }

    // Get all athlete IDs
    const athleteIds = [...new Set(members.map(m => m.athlete_id))]

    // Get today's date and date range
    const today = getLocalDateString()
    const rangeStart = new Date()
    rangeStart.setDate(rangeStart.getDate() - 30) // Always fetch 30 days for flexibility
    const rangeStartStr = getLocalDateString(rangeStart)

    // Get meal summaries for all athletes in the date range (restricted view - macros only)
    const { data: mealSummaries } = await supabase
      .from('coach_meal_summary')
      .select('athlete_id, date, total_calories, total_protein, total_carbs, total_fat, meal_count')
      .in('athlete_id', athleteIds)
      .gte('date', rangeStartStr)
      .lte('date', today)

    // Get nutrition recommendations for all athletes
    const { data: recs } = await supabase
      .from('nutrition_recommendations')
      .select('athlete_id, daily_calories, daily_protein_g')
      .in('athlete_id', athleteIds)

    const recsMap = Object.fromEntries((recs || []).map(r => [r.athlete_id, r]))

    // Get wellness check-ins for all athletes (last 14 days for trend detection)
    const wellnessStart = new Date()
    wellnessStart.setDate(wellnessStart.getDate() - 14)
    const wellnessStartStr = getLocalDateString(wellnessStart)

    const { data: wellnessData } = await supabase
      .from('coach_wellness_summary')
      .select('athlete_id, date, energy, stress, soreness, hydration, sleep_hours, training_type, wellness_score')
      .in('athlete_id', athleteIds)
      .gte('date', wellnessStartStr)
      .lte('date', today)
      .order('date', { ascending: false })

    // Group wellness data by athlete
    const wellnessMap: Record<string, WellnessCheckin[]> = {}
    for (const w of (wellnessData || [])) {
      if (!wellnessMap[w.athlete_id]) wellnessMap[w.athlete_id] = []
      wellnessMap[w.athlete_id].push(w)
    }

    // Process each athlete
    const athleteDataList: AthleteData[] = members.map((m: any) => {
      const athlete = m.athlete
      const profileData = athlete?.profile
      const rec = recsMap[m.athlete_id]
      const summaries = (mealSummaries || []).filter(s => s.athlete_id === m.athlete_id)

      // Today's totals (view already aggregates per day)
      const todaySummary = summaries.find(s => s.date === today)
      const todayCalories = todaySummary?.total_calories || 0
      const todayProtein = todaySummary?.total_protein || 0
      const loggedToday = !!todaySummary

      // Get unique dates with logs
      const logDates = summaries.map(s => s.date).sort()
      const daysActive = logDates.length

      // Calculate total days in range (up to 30)
      const totalDays = 30
      const complianceRate = totalDays > 0 ? Math.round((daysActive / totalDays) * 100) : 0

      // Calculate weekly trend: compare last 7 days vs prior 7 days
      const now = new Date()
      const last7Start = new Date(now)
      last7Start.setDate(last7Start.getDate() - 7)
      const prior7Start = new Date(now)
      prior7Start.setDate(prior7Start.getDate() - 14)
      const last7Days = logDates.filter(d => d >= getLocalDateString(last7Start) && d <= today).length
      const prior7Days = logDates.filter(d => d >= getLocalDateString(prior7Start) && d < getLocalDateString(last7Start)).length
      const trendDiff = last7Days - prior7Days
      const trend: 'up' | 'down' | 'stable' = trendDiff >= 2 ? 'up' : trendDiff <= -2 ? 'down' : 'stable'

      // Calculate streak (consecutive days ending today or yesterday)
      let streak = 0
      const dateSet = new Set(logDates)
      const checkDate = new Date()
      // If they didn't log today, start checking from yesterday
      if (!dateSet.has(getLocalDateString(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1)
      }
      while (dateSet.has(getLocalDateString(checkDate))) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      }

      // Last log date
      const lastLogDate = logDates.length > 0 ? logDates[logDates.length - 1] : null
      let daysSinceLastLog = 999
      if (lastLogDate) {
        const lastDate = new Date(lastLogDate + 'T12:00:00')
        const now = new Date()
        daysSinceLastLog = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Wellness data processing
      const athleteWellness = wellnessMap[m.athlete_id] || []
      const latestCheckin = athleteWellness.length > 0 ? athleteWellness[0] : null
      const wellnessScore = latestCheckin ? latestCheckin.wellness_score : null
      const wellnessLabel = wellnessScore !== null ? getZoneInfo(wellnessScore).label : null

      // Calculate check-in streak from wellness check-in dates
      let checkinStreak = 0
      if (athleteWellness.length > 0) {
        const checkinDates = athleteWellness.map(c => c.date).sort().reverse()
        const todayD = new Date(today)
        for (let i = 0; i < checkinDates.length; i++) {
          const expectedDate = new Date(todayD)
          expectedDate.setDate(todayD.getDate() - i)
          const expectedStr = expectedDate.toISOString().split('T')[0]
          if (checkinDates[i] === expectedStr) {
            checkinStreak++
          } else {
            break
          }
        }
      }
      const wellnessDate = latestCheckin ? latestCheckin.date : null
      let wellnessDaysAgo: number | null = null
      if (wellnessDate) {
        const wDate = new Date(wellnessDate + 'T12:00:00')
        const nowDate = new Date()
        wellnessDaysAgo = Math.floor((nowDate.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        id: m.athlete_id,
        profileId: athlete?.profile_id || '',
        name: profileData?.full_name || 'Unknown Athlete',
        email: profileData?.email || '',
        sport: athlete?.sport,
        position: athlete?.position,
        weight: athlete?.weight_lbs,
        goal: athlete?.goal_phase,
        season: athlete?.season_phase,
        userType: athlete?.user_type || 'athlete',
        activityLevel: athlete?.activity_level,
        trainingStyle: athlete?.training_style,
        teamId: m.team_id,
        teamName: teamMap[m.team_id] || 'Unknown Team',
        todayCalories,
        todayProtein,
        targetCalories: rec?.daily_calories || 0,
        targetProtein: rec?.daily_protein_g || 0,
        loggedToday,
        daysActive,
        totalDays,
        complianceRate,
        streak,
        lastLogDate,
        daysSinceLastLog,
        trend,
        wellnessScore,
        wellnessLabel,
        wellnessDate,
        wellnessDaysAgo,
        checkinStreak,
        recentCheckins: athleteWellness,
      }
    })

    setAthletes(athleteDataList)

    // Load pending supplements for this coach's athletes
    if (athleteIds.length > 0) {
      const { data: pendingSupps } = await supabase
        .from('supplements')
        .select('*')
        .in('athlete_id', athleteIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setPendingSupplements(pendingSupps || [])
    }

    // Load unread chat messages for this coach
    try {
      const { data: unreadMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })

      if (unreadMsgs && unreadMsgs.length > 0) {
        // Enrich with sender names from athletes list
        const enriched = unreadMsgs.map(msg => {
          const athlete = athleteDataList.find(a => a.id === msg.athlete_id)
          return {
            ...msg,
            sender_name: athlete?.name || 'Unknown',
            sender_email: athlete?.email || '',
          }
        })
        setUnreadMessages(enriched)
      } else {
        setUnreadMessages([])
      }
    } catch {
      // chat_messages table might not exist yet
      setUnreadMessages([])
    }

    setLoading(false)
  }

  // Filter athletes by selected team
  const filteredAthletes = useMemo(() => {
    if (selectedTeam === 'all') return athletes
    return athletes.filter(a => a.teamId === selectedTeam)
  }, [athletes, selectedTeam])

  // Leaderboard: sorted by compliance rate, then streak
  const leaderboard = useMemo(() => {
    return [...filteredAthletes].sort((a, b) => {
      if (b.complianceRate !== a.complianceRate) return b.complianceRate - a.complianceRate
      return b.streak - a.streak
    })
  }, [filteredAthletes])

  // Red flag athletes
  const redFlags = useMemo(() => {
    return filteredAthletes.filter(a => {
      // Haven't logged in 3+ days
      if (a.daysSinceLastLog >= 3) return true
      // Compliance below 30%
      if (a.complianceRate < 30) return true
      // Consistently under 50% of calorie target when they do log
      if (a.todayCalories > 0 && a.targetCalories > 0 && a.todayCalories < a.targetCalories * 0.5) return true
      return false
    }).sort((a, b) => b.daysSinceLastLog - a.daysSinceLastLog)
  }, [filteredAthletes])

  // Wellness alerts
  const wellnessAlerts = useMemo(() => {
    const alerts: { athlete: AthleteData; type: string; severity: 'high' | 'medium' | 'low'; message: string }[] = []

    filteredAthletes.forEach(a => {
      const checkins = a.recentCheckins
      if (checkins.length === 0) return

      const latest = checkins[0]

      // Acute stress: single check-in with stress >= 8 AND energy <= 3
      if (latest.stress >= 8 && latest.energy <= 3) {
        alerts.push({
          athlete: a,
          type: 'acute_stress',
          severity: 'high',
          message: `${a.name} reported very high stress (${latest.stress}/10) and very low energy (${latest.energy}/10) today`,
        })
      }

      // Sustained stress: stress >= 7 for 3+ consecutive check-ins
      if (checkins.length >= 3) {
        const last3 = checkins.slice(0, 3)
        if (last3.every(c => c.stress >= 7)) {
          // Count how many consecutive days
          let count = 0
          for (const c of checkins) {
            if (c.stress >= 7) count++
            else break
          }
          alerts.push({
            athlete: a,
            type: 'sustained_stress',
            severity: 'high',
            message: `${a.name} has reported high stress (7+) for ${count} days in a row`,
          })
        }
      }

      // Energy decline: energy dropped 3+ points over last 3 check-ins
      if (checkins.length >= 3) {
        const oldest = checkins[Math.min(2, checkins.length - 1)]
        const drop = oldest.energy - latest.energy
        if (drop >= 3) {
          alerts.push({
            athlete: a,
            type: 'energy_decline',
            severity: 'medium',
            message: `${a.name}'s energy dropped from ${oldest.energy}/10 to ${latest.energy}/10 over the last few days`,
          })
        }
      }

      // Sleep deprivation: sleep < 5h for 2+ consecutive days
      if (checkins.length >= 2) {
        const last2 = checkins.slice(0, 2)
        if (last2.every(c => c.sleep_hours !== null && c.sleep_hours < 5)) {
          let count = 0
          for (const c of checkins) {
            if (c.sleep_hours !== null && c.sleep_hours < 5) count++
            else break
          }
          alerts.push({
            athlete: a,
            type: 'sleep_deprivation',
            severity: 'medium',
            message: `${a.name} has slept under 5 hours for ${count} nights in a row`,
          })
        }
      }

      // Recovery overload: soreness >= 8 for 3+ consecutive days
      if (checkins.length >= 3) {
        const last3 = checkins.slice(0, 3)
        if (last3.every(c => c.soreness >= 8)) {
          let count = 0
          for (const c of checkins) {
            if (c.soreness >= 8) count++
            else break
          }
          alerts.push({
            athlete: a,
            type: 'recovery_overload',
            severity: 'medium',
            message: `${a.name} has reported high soreness (8+) for ${count} days — possible overtraining`,
          })
        }
      }

      // Composite decline: Fuel Score below 50 for 2+ days (Red Flag zone)
      if (checkins.length >= 2) {
        const last2 = checkins.slice(0, 2)
        if (last2.every(c => c.wellness_score < 50)) {
          alerts.push({
            athlete: a,
            type: 'composite_decline',
            severity: 'high',
            message: `${a.name}'s Fuel Score has been in the Red Flag zone (below 50) for multiple days`,
          })
        }
      }
    })

    // Sort by severity: high first, then medium, then low
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [filteredAthletes])

  // Top-level coach notification alerts
  const coachNotifications = useMemo(() => {
    const items: Array<{ id: string; type: 'danger' | 'warning' | 'info'; icon: string; message: string; action?: () => void }> = []

    // Pending supplement requests
    if (pendingSupplements.length > 0) {
      const names = [...new Set(pendingSupplements.map(s => {
        const a = athletes.find(at => at.id === s.athlete_id)
        return a?.name || 'Unknown'
      }))]
      items.push({
        id: 'pending_supplements',
        type: 'warning',
        icon: '💊',
        message: `${pendingSupplements.length} supplement${pendingSupplements.length > 1 ? 's' : ''} pending your review from ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''}`,
        action: () => {
          // Navigate to the first athlete with a pending supplement
          const firstPending = pendingSupplements[0]
          if (firstPending?.athlete_id) {
            router.push(`/coach/athlete/${firstPending.athlete_id}`)
            return
          }
          setView('alerts')
        },
      })
    }

    // Athletes with missed check-ins (2+ days)
    const missedCheckin = athletes.filter(a => {
      const checkins = a.recentCheckins
      if (checkins.length === 0) return true // never checked in
      const latest = checkins[0]
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const twoDaysAgoStr = getLocalDateString(twoDaysAgo)
      return latest.date < twoDaysAgoStr
    })
    if (missedCheckin.length > 0) {
      items.push({
        id: 'missed_checkins',
        type: 'warning',
        icon: '📋',
        message: `${missedCheckin.length} athlete${missedCheckin.length > 1 ? 's' : ''} missed check-in (2+ days): ${missedCheckin.slice(0, 3).map(a => a.name).join(', ')}${missedCheckin.length > 3 ? ` +${missedCheckin.length - 3} more` : ''}`,
        action: () => setView('alerts'),
      })
    }

    // High stress/soreness today (7+ on scale)
    const highStress = athletes.filter(a => {
      if (a.recentCheckins.length === 0) return false
      const latest = a.recentCheckins[0]
      const today = getLocalDateString()
      return latest.date === today && (latest.stress >= 7 || latest.soreness >= 7)
    })
    if (highStress.length > 0) {
      items.push({
        id: 'high_stress',
        type: 'danger',
        icon: '⚠️',
        message: `${highStress.length} athlete${highStress.length > 1 ? 's' : ''} reporting high stress/soreness (7+) today: ${highStress.slice(0, 3).map(a => a.name).join(', ')}${highStress.length > 3 ? ` +${highStress.length - 3} more` : ''}`,
        action: () => setView('alerts'),
      })
    }

    // Unread chat messages
    if (unreadMessages.length > 0) {
      const senderNames = [...new Set(unreadMessages.map(m => m.sender_name || 'Unknown'))]
      items.push({
        id: 'unread_messages',
        type: 'info',
        icon: '💬',
        message: `${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''} from ${senderNames.slice(0, 3).join(', ')}${senderNames.length > 3 ? ` +${senderNames.length - 3} more` : ''}`,
        action: () => setView('messages'),
      })
    }

    return items.filter(a => !dismissedCoachAlerts.has(a.id))
  }, [pendingSupplements, athletes, dismissedCoachAlerts, unreadMessages])

  function dismissCoachAlert(id: string) {
    setDismissedCoachAlerts(prev => {
      const next = new Set([...prev, id])
      try { localStorage.setItem('coach_dismissed_alerts', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredAthletes.length
    const loggedToday = filteredAthletes.filter(a => a.loggedToday).length
    const avgCompliance = total > 0
      ? Math.round(filteredAthletes.reduce((sum, a) => sum + a.complianceRate, 0) / total)
      : 0
    const avgStreak = total > 0
      ? Math.round(filteredAthletes.reduce((sum, a) => sum + a.streak, 0) / total * 10) / 10
      : 0
    const avgWellness = total > 0
      ? Math.round(filteredAthletes.filter(a => a.wellnessScore !== null).reduce((sum, a) => sum + (a.wellnessScore || 0), 0) / Math.max(filteredAthletes.filter(a => a.wellnessScore !== null).length, 1))
      : null

    // Zone distribution for Fuel Score chart
    const withScores = filteredAthletes.filter(a => a.wellnessScore !== null)
    const lockedIn = withScores.filter(a => (a.wellnessScore || 0) >= 85).length
    const onTrack = withScores.filter(a => (a.wellnessScore || 0) >= 70 && (a.wellnessScore || 0) < 85).length
    const dialItIn = withScores.filter(a => (a.wellnessScore || 0) >= 50 && (a.wellnessScore || 0) < 70).length
    const redFlag = withScores.filter(a => (a.wellnessScore || 0) < 50).length
    const noCheckin = filteredAthletes.filter(a => a.wellnessScore === null).length

    return { total, loggedToday, avgCompliance, avgStreak, redFlagCount: redFlags.length, wellnessAlertCount: wellnessAlerts.length, avgWellness, lockedIn, onTrack, dialItIn, redFlag, noCheckin }
  }, [filteredAthletes, redFlags, wellnessAlerts])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  // No teams state
  if (teams.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Welcome, {coachName}!</h2>
          <p className="text-slate-400 mb-6">{isAdmin ? 'No teams or athletes found. Create teams and assign athletes from the Admin Dashboard.' : 'Create your first team to start tracking athlete compliance. Share the invite code with your athletes so they can join.'}</p>
          <button
            onClick={() => router.push(isAdmin ? '/admin' : '/coach/teams')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            {isAdmin ? 'Back to Admin Dashboard' : 'Create Your First Team'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Coach Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome back, {coachName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Primary: Admin (if admin) */}
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                ← Admin
              </button>
            )}

            {/* Primary: Invite */}
            <button
              onClick={() => router.push('/coach/invite')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              + Invite
            </button>

            {/* Primary: Messages */}
            <button
              onClick={() => setView('messages')}
              className={`relative p-2 rounded-lg border transition-colors ${
                view === 'messages'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title="Messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {unreadMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
                </span>
              )}
            </button>

            {/* Primary: Refresh */}
            <button
              onClick={loadData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>

            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 transition-colors"
                title="More"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden">
                    <button
                      onClick={() => { router.push('/coach/teams'); setShowMoreMenu(false) }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Manage Teams
                    </button>
                    <button
                      onClick={() => { router.push('/coach/supplements'); setShowMoreMenu(false) }}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      Supplements
                    </button>
                    {!isAdmin && (
                      <button
                        onClick={() => { router.push('/coach/billing'); setShowMoreMenu(false) }}
                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        Billing
                      </button>
                    )}
                    <div className="border-t border-slate-700" />
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut()
                        router.push('/login')
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Coach Notification Banner */}
        {coachNotifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {coachNotifications.map(alert => {
              const bgColor = alert.type === 'danger' ? 'bg-red-500/10 border-red-500/30' : alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'
              const textColor = alert.type === 'danger' ? 'text-red-300' : alert.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
              return (
                <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColor}`}>
                  <span className="text-lg flex-shrink-0">{alert.icon}</span>
                  <p className={`text-sm flex-1 ${textColor}`}>{alert.message}</p>
                  {alert.action && (
                    <button
                      onClick={alert.action}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors flex-shrink-0 ${
                        alert.type === 'danger' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' :
                        alert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' :
                        'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                      }`}
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => dismissCoachAlert(alert.id)}
                    className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Team Filter + View Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600 appearance-none"
            >
              <option value="all">All Teams ({athletes.length})</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({athletes.filter(a => a.teamId === t.id).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'leaderboard', label: 'Leaderboard' },
              { key: 'alerts', label: `Alerts${(redFlags.length + wellnessAlerts.length) > 0 ? ` (${redFlags.length + wellnessAlerts.length})` : ''}` },
              { key: 'messages', label: `Messages${unreadMessages.length > 0 ? ` (${unreadMessages.length})` : ''}` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Athletes</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Logged Today</p>
            <p className="text-2xl font-bold text-white mt-1">
              <span className={stats.loggedToday > 0 ? 'text-green-400' : 'text-slate-500'}>{stats.loggedToday}</span>
              <span className="text-slate-500 text-lg">/{stats.total}</span>
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avg Compliance</p>
            <p className="text-2xl font-bold text-white mt-1">
              <span className={stats.avgCompliance >= 70 ? 'text-green-400' : stats.avgCompliance >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                {stats.avgCompliance}%
              </span>
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avg Streak</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.avgStreak} <span className="text-slate-500 text-sm">days</span></p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avg Wellness</p>
            <p className="text-2xl font-bold mt-1">
              {stats.avgWellness !== null ? (
                <span className={getWellnessColor(stats.avgWellness)}>{stats.avgWellness}</span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Alerts</p>
            <p className="text-2xl font-bold mt-1">
              <span className={(stats.redFlagCount + stats.wellnessAlertCount) > 0 ? 'text-red-400' : 'text-green-400'}>{stats.redFlagCount + stats.wellnessAlertCount}</span>
            </p>
          </div>
        </div>

        {/* Team Fuel Score Distribution */}
        {view === 'overview' && stats.total > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Team Fuel Score Distribution</h3>
              <span className="text-slate-500 text-xs">{stats.total - stats.noCheckin} of {stats.total} checked in</span>
            </div>

            {/* Horizontal stacked bar */}
            {(stats.total - stats.noCheckin) > 0 ? (
              <>
                <div className="flex rounded-lg overflow-hidden h-10 mb-4">
                  {stats.lockedIn > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center transition-all"
                      style={{ width: `${(stats.lockedIn / (stats.total - stats.noCheckin)) * 100}%` }}
                    >
                      {stats.lockedIn > 0 && <span className="text-white text-xs font-bold">{stats.lockedIn}</span>}
                    </div>
                  )}
                  {stats.onTrack > 0 && (
                    <div
                      className="bg-blue-500 flex items-center justify-center transition-all"
                      style={{ width: `${(stats.onTrack / (stats.total - stats.noCheckin)) * 100}%` }}
                    >
                      {stats.onTrack > 0 && <span className="text-white text-xs font-bold">{stats.onTrack}</span>}
                    </div>
                  )}
                  {stats.dialItIn > 0 && (
                    <div
                      className="bg-amber-500 flex items-center justify-center transition-all"
                      style={{ width: `${(stats.dialItIn / (stats.total - stats.noCheckin)) * 100}%` }}
                    >
                      {stats.dialItIn > 0 && <span className="text-white text-xs font-bold">{stats.dialItIn}</span>}
                    </div>
                  )}
                  {stats.redFlag > 0 && (
                    <div
                      className="bg-red-500 flex items-center justify-center transition-all"
                      style={{ width: `${(stats.redFlag / (stats.total - stats.noCheckin)) * 100}%` }}
                    >
                      {stats.redFlag > 0 && <span className="text-white text-xs font-bold">{stats.redFlag}</span>}
                    </div>
                  )}
                </div>

                {/* Zone legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500 flex-shrink-0" />
                    <div>
                      <span className="text-green-400 text-sm font-semibold">{stats.lockedIn}</span>
                      <span className="text-slate-400 text-xs ml-1">🔥 Locked In</span>
                      <span className="text-slate-600 text-xs ml-1">(85+)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500 flex-shrink-0" />
                    <div>
                      <span className="text-blue-400 text-sm font-semibold">{stats.onTrack}</span>
                      <span className="text-slate-400 text-xs ml-1">💪 On Track</span>
                      <span className="text-slate-600 text-xs ml-1">(70-84)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-amber-500 flex-shrink-0" />
                    <div>
                      <span className="text-amber-400 text-sm font-semibold">{stats.dialItIn}</span>
                      <span className="text-slate-400 text-xs ml-1">⚡ Dial It In</span>
                      <span className="text-slate-600 text-xs ml-1">(50-69)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500 flex-shrink-0" />
                    <div>
                      <span className="text-red-400 text-sm font-semibold">{stats.redFlag}</span>
                      <span className="text-slate-400 text-xs ml-1">🚩 Red Flag</span>
                      <span className="text-slate-600 text-xs ml-1">(&lt;50)</span>
                    </div>
                  </div>
                </div>

                {stats.noCheckin > 0 && (
                  <p className="text-slate-500 text-xs mt-3">
                    {stats.noCheckin} athlete{stats.noCheckin !== 1 ? 's' : ''} ha{stats.noCheckin !== 1 ? 've' : 's'}n't checked in yet
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">No check-in data yet today. Athletes need to complete their daily check-in.</p>
            )}
          </div>
        )}

        {/* Overview View */}
        {view === 'overview' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Team Overview</h3>
              <p className="text-slate-400 text-sm">{filteredAthletes.length} athletes</p>
            </div>

            {filteredAthletes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400">No athletes have joined this team yet. Share the invite code with your athletes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Athlete</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Today</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Wellness</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">7-Day Avg</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Calories</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Protein</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Streak</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Compliance <span className="normal-case text-slate-500">(7d trend)</span></th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredAthletes.map(a => {
                      const calPct = a.targetCalories > 0 ? Math.round((a.todayCalories / a.targetCalories) * 100) : 0
                      const proPct = a.targetProtein > 0 ? Math.round((a.todayProtein / a.targetProtein) * 100) : 0
                      return (
                        <tr key={a.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{a.name}</p>
                                <p className="text-slate-500 text-xs">{formatUserContext(a)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {a.loggedToday ? (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                Logged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                Not yet
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {a.wellnessScore !== null ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${getWellnessBgColor(a.wellnessScore)} ${getWellnessColor(a.wellnessScore)}`}>
                                  {a.wellnessScore}
                                </span>
                                {a.wellnessDaysAgo !== null && a.wellnessDaysAgo > 0 && (
                                  <span className="text-slate-500 text-[10px]">{a.wellnessDaysAgo}d ago</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs">No data</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <WellnessSpotlight
                              checkins={a.recentCheckins.map(c => ({ date: c.date, wellness_score: c.wellness_score }))}
                              compact
                              role="coach"
                            />
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${calPct >= 80 ? 'bg-green-500' : calPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(calPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-slate-300 text-xs font-mono w-20">
                                {a.todayCalories}/{a.targetCalories > 0 ? a.targetCalories : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${proPct >= 80 ? 'bg-green-500' : proPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(proPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-slate-300 text-xs font-mono w-16">
                                {a.todayProtein}/{a.targetProtein > 0 ? `${a.targetProtein}g` : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-white text-sm font-medium">{a.streak}</span>
                            <span className="text-slate-500 text-xs ml-1">days</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-semibold ${
                                a.complianceRate >= 70 ? 'text-green-400' : a.complianceRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {a.complianceRate}%
                              </span>
                              {a.trend === 'up' && (
                                <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                              )}
                              {a.trend === 'down' && (
                                <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              )}
                              {a.trend === 'stable' && (
                                <span className="text-slate-500 text-xs font-bold">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => router.push(`/coach/athlete/${a.id}`)}
                              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard View */}
        {view === 'leaderboard' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-white font-semibold">Commitment Leaderboard</h3>
              <p className="text-slate-400 text-sm mt-0.5">Ranked by 30-day compliance rate</p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400">No athletes to rank yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {leaderboard.map((a, i) => {
                  const rank = i + 1
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                  return (
                    <div
                      key={a.id}
                      className="px-4 py-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/coach/athlete/${a.id}`)}
                    >
                      <div className="w-10 text-center flex-shrink-0">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-slate-500 text-sm font-bold">#{rank}</span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{a.name}</p>
                        <p className="text-slate-500 text-xs">{a.teamName} · {formatUserContext(a)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${
                          a.complianceRate >= 70 ? 'text-green-400' : a.complianceRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {a.complianceRate}%
                        </p>
                        <p className="text-slate-500 text-xs">{a.streak} day streak</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Alerts View */}
        {view === 'alerts' && (
          <div className="space-y-6">
            {(redFlags.length + wellnessAlerts.length) === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-white font-semibold mb-1">All Clear!</h3>
                <p className="text-slate-400 text-sm">No athletes need attention right now.</p>
              </div>
            ) : (
              <>
                {/* Wellness Alerts Section */}
                {wellnessAlerts.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      <p className="text-amber-400 text-sm font-medium">{wellnessAlerts.length} wellness alert{wellnessAlerts.length !== 1 ? 's' : ''} — athletes may need a check-in conversation</p>
                    </div>

                    {wellnessAlerts.map((alert, idx) => (
                      <div
                        key={`wellness-${idx}`}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer"
                        onClick={() => router.push(`/coach/athlete/${alert.athlete.id}`)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            alert.severity === 'high' ? 'bg-red-500/10' : alert.severity === 'medium' ? 'bg-amber-500/10' : 'bg-yellow-500/10'
                          }`}>
                            <svg className={`w-5 h-5 ${
                              alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-yellow-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium">{alert.athlete.name}</p>
                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  alert.severity === 'high' ? 'bg-red-500/20 text-red-400' : alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>{alert.severity}</span>
                              </div>
                              <span className="text-purple-400 text-sm hover:text-purple-300">View →</span>
                            </div>
                            <p className="text-slate-500 text-xs mb-2">{alert.athlete.teamName} · {formatUserContext(alert.athlete)}</p>
                            <div className="flex items-center gap-2">
                              <svg className={`w-3.5 h-3.5 flex-shrink-0 ${
                                alert.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                              <span className="text-slate-300 text-sm">{alert.message}</span>
                            </div>
                            {alert.athlete.wellnessScore !== null && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${getWellnessBgColor(alert.athlete.wellnessScore)} ${getWellnessColor(alert.athlete.wellnessScore)}`}>
                                  {alert.athlete.wellnessScore}
                                </span>
                                <span className="text-slate-500 text-xs">Fuel Score</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nutrition Alerts Section */}
                {redFlags.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      <p className="text-red-400 text-sm font-medium">{redFlags.length} nutrition alert{redFlags.length !== 1 ? 's' : ''} — logging compliance issues</p>
                    </div>

                    {redFlags.map(a => {
                      const reasons: string[] = []
                      if (a.daysSinceLastLog >= 3) reasons.push(`Haven't logged in ${a.daysSinceLastLog} days`)
                      if (a.complianceRate < 30) reasons.push(`Only ${a.complianceRate}% compliance (30 days)`)
                      if (a.todayCalories > 0 && a.targetCalories > 0 && a.todayCalories < a.targetCalories * 0.5) reasons.push(`Under 50% of calorie target today`)

                      return (
                        <div
                          key={a.id}
                          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer"
                          onClick={() => router.push(`/coach/athlete/${a.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold flex-shrink-0">
                              {a.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-white font-medium">{a.name}</p>
                                <span className="text-purple-400 text-sm hover:text-purple-300">View →</span>
                              </div>
                              <p className="text-slate-500 text-xs mb-2">{a.teamName} · {formatUserContext(a)}</p>
                              <div className="flex flex-col gap-1">
                                {reasons.map((r, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    <span className="text-slate-300 text-sm">{r}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Messages View */}
        {view === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Messages</h3>
              {unreadMessages.length > 0 && (
                <span className="text-sm text-slate-400">{unreadMessages.length} unread</span>
              )}
            </div>

            {(() => {
              // Group messages by athlete
              const grouped = unreadMessages.reduce((acc, msg) => {
                if (!acc[msg.athlete_id]) {
                  acc[msg.athlete_id] = {
                    athlete_id: msg.athlete_id,
                    sender_name: msg.sender_name || 'Unknown',
                    messages: [],
                  }
                }
                acc[msg.athlete_id].messages.push(msg)
                return acc
              }, {} as Record<string, { athlete_id: string; sender_name: string; messages: typeof unreadMessages }>)

              const conversations = Object.values(grouped).sort(
                (a, b) => new Date(b.messages[0].created_at).getTime() - new Date(a.messages[0].created_at).getTime()
              )

              if (conversations.length === 0) {
                return (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">All Caught Up!</h3>
                    <p className="text-slate-400 text-sm">No unread messages from your athletes. Messages will appear here when athletes send you a chat.</p>
                  </div>
                )
              }

              return conversations.map(conv => {
                const latestMsg = conv.messages[0]
                const athlete = athletes.find(a => a.id === conv.athlete_id)
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(latestMsg.created_at).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 1) return 'Just now'
                  if (mins < 60) return `${mins}m ago`
                  const hrs = Math.floor(mins / 60)
                  if (hrs < 24) return `${hrs}h ago`
                  const days = Math.floor(hrs / 24)
                  return `${days}d ago`
                })()

                return (
                  <div
                    key={conv.athlete_id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer group"
                    onClick={() => router.push(`/coach/athlete/${conv.athlete_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                        {conv.sender_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{conv.sender_name}</p>
                            <span className="bg-red-500/20 text-red-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                              {conv.messages.length} new
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">{timeAgo}</span>
                            <span className="text-purple-400 text-sm group-hover:text-purple-300">Open →</span>
                          </div>
                        </div>
                        {athlete && (
                          <p className="text-slate-500 text-xs mb-1.5">{athlete.teamName} · {formatUserContext(athlete)}</p>
                        )}
                        <p className="text-slate-300 text-sm truncate">{latestMsg.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>
    </main>
  )
}
