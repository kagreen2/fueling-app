'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  created_at: string
}

interface Team {
  id: string
  name: string
  sport: string | null
  invite_code: string
  coach_id: string
  created_at: string
}

interface TeamMember {
  team_id: string
  athlete_id: string
}

interface Athlete {
  id: string
  profile_id: string
  sport: string | null
  position: string | null
  weight_lbs: number | null
  goal_phase: string | null
  season_phase: string | null
}

interface NutritionRec {
  athlete_id: string
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
}

interface MealLog {
  id: string
  athlete_id: string
  date: string
  calories: number
  protein: number
}

interface Checkin {
  athlete_id: string
  date: string
  energy: number
  stress: number
  soreness: number
  sleep_hours: number
  hydration_status: number
}

function formatSport(sport: string | null): string {
  if (!sport) return 'N/A'
  return sport.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'users' | 'nutrition' | 'billing' | 'settings'>('overview')

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [nutritionRecs, setNutritionRecs] = useState<NutritionRec[]>([])
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [allowCoachAdjustments, setAllowCoachAdjustments] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // User editing state
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: '' })
  const [savingUser, setSavingUser] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData || !['admin', 'super_admin'].includes(profileData.role)) {
        router.push('/athlete/dashboard')
        return
      }
      setProfile(profileData)

      const [
        profilesRes, teamsRes, teamMembersRes, athletesRes,
        recsRes, mealsRes, checkinsRes, settingsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('teams').select('*').order('name'),
        supabase.from('team_members').select('*'),
        supabase.from('athletes').select('*'),
        supabase.from('nutrition_recommendations').select('*'),
        supabase.from('meal_logs').select('id, athlete_id, date, calories, protein').order('date', { ascending: false }).limit(200),
        supabase.from('daily_checkins').select('athlete_id, date, energy, stress, soreness, sleep_hours, hydration_status').order('date', { ascending: false }).limit(200),
        supabase.from('admin_settings').select('*'),
      ])

      if (profilesRes.data) setProfiles(profilesRes.data)
      if (teamsRes.data) setTeams(teamsRes.data)
      if (teamMembersRes.data) setTeamMembers(teamMembersRes.data)
      if (athletesRes.data) setAthletes(athletesRes.data)
      if (recsRes.data) setNutritionRecs(recsRes.data)
      if (mealsRes.data) setMealLogs(mealsRes.data)
      if (checkinsRes.data) setCheckins(checkinsRes.data)

      if (settingsRes.data) {
        const coachAdj = settingsRes.data.find((s: any) => s.setting_key === 'allow_coach_recommendation_adjustments')
        if (coachAdj) setAllowCoachAdjustments(coachAdj.setting_value === true || coachAdj.setting_value === 'true')
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading admin data:', error)
      setLoading(false)
    }
  }

  const athleteProfiles = useMemo(() => profiles.filter(p => p.role === 'athlete'), [profiles])
  const coachProfiles = useMemo(() => profiles.filter(p => p.role === 'coach'), [profiles])
  const adminProfiles = useMemo(() => profiles.filter(p => ['admin', 'super_admin'].includes(p.role)), [profiles])

  const athleteByProfileId = useMemo(() => {
    const map: Record<string, Athlete> = {}
    athletes.forEach(a => { map[a.profile_id] = a })
    return map
  }, [athletes])

  const profileByAthleteId = useMemo(() => {
    const map: Record<string, Profile> = {}
    athletes.forEach(a => {
      const p = profiles.find(pr => pr.id === a.profile_id)
      if (p) map[a.id] = p
    })
    return map
  }, [athletes, profiles])

  const teamAthleteMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    teamMembers.forEach(tm => {
      if (!map[tm.team_id]) map[tm.team_id] = []
      map[tm.team_id].push(tm.athlete_id)
    })
    return map
  }, [teamMembers])

  const unassignedAthletes = useMemo(() => {
    const assignedAthleteIds = new Set(teamMembers.map(tm => tm.athlete_id))
    return athletes.filter(a => !assignedAthleteIds.has(a.id))
  }, [athletes, teamMembers])

  const recByAthleteId = useMemo(() => {
    const map: Record<string, NutritionRec> = {}
    nutritionRecs.forEach(r => { map[r.athlete_id] = r })
    return map
  }, [nutritionRecs])

  const today = getLocalDateString()

  const todayMeals = useMemo(() => mealLogs.filter(m => m.date === today), [mealLogs, today])

  const latestCheckinByAthlete = useMemo(() => {
    const map: Record<string, Checkin> = {}
    checkins.forEach(c => {
      if (!map[c.athlete_id]) map[c.athlete_id] = c
    })
    return map
  }, [checkins])

  const stats = useMemo(() => ({
    totalUsers: profiles.length,
    totalAthletes: athleteProfiles.length,
    totalCoaches: coachProfiles.length,
    totalAdmins: adminProfiles.length,
    totalTeams: teams.length,
    totalMeals: mealLogs.length,
    totalCheckins: checkins.length,
    loggedToday: new Set(todayMeals.map(m => m.athlete_id)).size,
    checkedInToday: new Set(checkins.filter(c => c.date === today).map(c => c.athlete_id)).size,
  }), [profiles, athleteProfiles, coachProfiles, adminProfiles, teams, mealLogs, checkins, todayMeals, today])

  const filteredUsers = useMemo(() => {
    return profiles.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = filterRole === 'all' || user.role === filterRole ||
                         (filterRole === 'admin' && ['admin', 'super_admin'].includes(user.role))
      return matchesSearch && matchesRole
    })
  }, [profiles, searchQuery, filterRole])

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (!error) {
        setProfiles(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      }
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleCoachAdjustments() {
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: !allowCoachAdjustments })
        .eq('setting_key', 'allow_coach_recommendation_adjustments')
      if (!error) setAllowCoachAdjustments(!allowCoachAdjustments)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
    setSavingSettings(false)
  }

  function openEditUser(user: Profile) {
    setEditingUser(user)
    setEditForm({ full_name: user.full_name, phone: user.phone || '', role: user.role })
    setResetEmailSent(null)
  }

  async function saveUserEdits() {
    if (!editingUser) return
    setSavingUser(true)
    try {
      const updates: any = { full_name: editForm.full_name.trim() }
      if (editForm.phone.trim()) updates.phone = editForm.phone.trim()
      else updates.phone = null
      if (editForm.role !== editingUser.role && editingUser.id !== profile?.id) {
        updates.role = editForm.role
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id)

      if (!error) {
        setProfiles(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u))
        setEditingUser(null)
      } else {
        console.error('Error saving user:', error)
      }
    } catch (error) {
      console.error('Error saving user:', error)
    }
    setSavingUser(false)
  }

  async function sendPasswordReset() {
    if (!editingUser) return
    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(editingUser.email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (!error) {
        setResetEmailSent(editingUser.email)
      } else {
        console.error('Error sending reset:', error)
      }
    } catch (error) {
      console.error('Error sending reset:', error)
    }
    setSendingReset(false)
  }

  async function handleDeleteUser() {
    if (!confirmDelete) return
    setDeletingUser(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: confirmDelete.id }),
      })
      const data = await res.json()
      if (data.success) {
        setProfiles(prev => prev.filter(u => u.id !== confirmDelete.id))
        setConfirmDelete(null)
        setEditingUser(null)
      } else {
        console.error('Delete failed:', data.error)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
    setDeletingUser(false)
  }

  function renderAthleteRow(athleteId: string) {
    const prof = profileByAthleteId[athleteId]
    const athlete = athletes.find(a => a.id === athleteId)
    const rec = recByAthleteId[athleteId]
    const latestCheckin = latestCheckinByAthlete[athleteId]
    const athleteMealsToday = todayMeals.filter(m => m.athlete_id === athleteId)
    const todayCals = athleteMealsToday.reduce((sum, m) => sum + (m.calories || 0), 0)
    const todayPro = athleteMealsToday.reduce((sum, m) => sum + (m.protein || 0), 0)

    if (!prof) return null

    return (
      <tr key={athleteId} className="hover:bg-slate-700/30 transition-colors border-b border-slate-700/50 last:border-0">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
              {prof.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{prof.full_name}</p>
              <p className="text-slate-500 text-xs">{prof.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-slate-300 text-sm">
          {formatSport(athlete?.sport || null)}
          {athlete?.position ? ` \u00B7 ${athlete.position}` : ''}
        </td>
        <td className="px-4 py-3">
          {athleteMealsToday.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {todayCals} cal / {todayPro}g pro
            </span>
          ) : (
            <span className="text-slate-500 text-xs">Not logged</span>
          )}
        </td>
        <td className="px-4 py-3">
          {rec ? (
            <span className="text-slate-300 text-xs font-mono">{rec.daily_calories} cal</span>
          ) : (
            <span className="text-slate-500 text-xs">No plan</span>
          )}
        </td>
        <td className="px-4 py-3">
          {latestCheckin ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${latestCheckin.energy >= 7 ? 'text-green-400' : latestCheckin.energy >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                E:{latestCheckin.energy}
              </span>
              <span className={`text-xs font-medium ${latestCheckin.stress <= 3 ? 'text-green-400' : latestCheckin.stress <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                S:{latestCheckin.stress}
              </span>
              <span className="text-slate-500 text-[10px]">{latestCheckin.date === today ? 'today' : latestCheckin.date}</span>
            </div>
          ) : (
            <span className="text-slate-500 text-xs">No check-in</span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => router.push(`/coach/athlete/${athleteId}`)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            View
          </button>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">&#9889;</div>
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">{profile?.full_name} &middot; Super Admin</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/coach/dashboard')}
                className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Coach View
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-b border-slate-800 -mb-4 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'teams', label: `Teams (${stats.totalTeams})` },
              { key: 'users', label: `Users (${stats.totalUsers})` },
              { key: 'nutrition', label: 'Nutrition' },
              { key: 'billing', label: 'Billing' },
              { key: 'settings', label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
                <p className="text-slate-500 text-xs mt-1">{stats.totalAthletes} athletes &middot; {stats.totalCoaches} coaches &middot; {stats.totalAdmins} admins</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Teams</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalTeams}</p>
                <p className="text-slate-500 text-xs mt-1">{unassignedAthletes.length} unassigned</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Logged Today</p>
                <p className="text-2xl font-bold mt-1">
                  <span className={stats.loggedToday > 0 ? 'text-green-400' : 'text-slate-500'}>{stats.loggedToday}</span>
                  <span className="text-slate-500 text-sm font-normal"> / {stats.totalAthletes}</span>
                </p>
                <p className="text-slate-500 text-xs mt-1">meal logs</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Checked In</p>
                <p className="text-2xl font-bold mt-1">
                  <span className={stats.checkedInToday > 0 ? 'text-green-400' : 'text-slate-500'}>{stats.checkedInToday}</span>
                  <span className="text-slate-500 text-sm font-normal"> / {stats.totalAthletes}</span>
                </p>
                <p className="text-slate-500 text-xs mt-1">wellness today</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">All Time</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalMeals}</p>
                <p className="text-slate-500 text-xs mt-1">meals logged</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-300 mb-4">Teams at a Glance</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {teams.map(team => {
                const coachProfile = profiles.find(p => p.id === team.coach_id)
                const memberIds = teamAthleteMap[team.id] || []
                return (
                  <div key={team.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => setActiveTab('teams')}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">{team.name}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">{formatSport(team.sport)}</p>
                      </div>
                      <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded font-mono">{team.invite_code}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Coach:</span>{' '}
                        <span className="text-white">{coachProfile?.full_name || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Athletes:</span>{' '}
                        <span className="text-white font-semibold">{memberIds.length}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {teams.length === 0 && (
                <div className="col-span-full bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No teams created yet.</p>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold text-slate-300 mb-4">Staff Directory</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h4 className="text-white font-semibold text-sm">Coaches ({coachProfiles.length})</h4>
                </div>
                {coachProfiles.length > 0 ? (
                  <div className="divide-y divide-slate-700/50">
                    {coachProfiles.map(c => {
                      const coachTeams = teams.filter(t => t.coach_id === c.id)
                      return (
                        <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{c.full_name}</p>
                            <p className="text-slate-500 text-xs">{c.email}</p>
                            {coachTeams.length > 0 && (
                              <p className="text-purple-400 text-xs mt-1">{coachTeams.map(t => t.name).join(', ')}</p>
                            )}
                          </div>
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Coach</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center"><p className="text-slate-500 text-sm">No coaches</p></div>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h4 className="text-white font-semibold text-sm">Admins ({adminProfiles.length})</h4>
                </div>
                {adminProfiles.length > 0 ? (
                  <div className="divide-y divide-slate-700/50">
                    {adminProfiles.map(a => (
                      <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{a.full_name}</p>
                          <p className="text-slate-500 text-xs">{a.email}</p>
                        </div>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded capitalize">{a.role.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center"><p className="text-slate-500 text-sm">No admins</p></div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══ TEAMS TAB ═══ */}
        {activeTab === 'teams' && (
          <div className="space-y-8">
            {teams.map(team => {
              const coachProfile = profiles.find(p => p.id === team.coach_id)
              const memberIds = teamAthleteMap[team.id] || []
              return (
                <div key={team.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{team.name}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">
                        {formatSport(team.sport)} &middot; Coach: {coachProfile?.full_name || 'Unassigned'} &middot; {memberIds.length} athlete{memberIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-mono tracking-wider">{team.invite_code}</span>
                  </div>
                  {memberIds.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700 text-left">
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Athlete</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Sport / Position</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Today&#39;s Log</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Target</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Wellness</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberIds.map(aid => renderAthleteRow(aid))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-slate-500 text-sm">No athletes on this team yet. Share invite code <span className="font-mono text-purple-400">{team.invite_code}</span> to add athletes.</p>
                    </div>
                  )}
                </div>
              )
            })}

            {unassignedAthletes.length > 0 && (
              <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h3 className="text-orange-400 font-semibold text-lg">Unassigned Athletes</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{unassignedAthletes.length} athlete{unassignedAthletes.length !== 1 ? 's' : ''} not on any team</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 text-left">
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Athlete</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Sport / Position</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Today&#39;s Log</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Target</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Wellness</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedAthletes.map(a => renderAthleteRow(a.id))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {teams.length === 0 && unassignedAthletes.length === 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400">No teams or athletes found.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {activeTab === 'users' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">User Management</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-600"
              >
                <option value="all">All Roles</option>
                <option value="athlete">Athletes</option>
                <option value="coach">Coaches</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Phone</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              ['admin', 'super_admin'].includes(user.role) ? 'bg-red-500/20 text-red-400' :
                              user.role === 'coach' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-purple-600/20 text-purple-400'
                            }`}>
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{user.full_name}</p>
                              <p className="text-slate-500 text-xs">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">{user.phone || '\u2014'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${
                            ['admin', 'super_admin'].includes(user.role) ? 'bg-red-500/20 text-red-400' :
                            user.role === 'coach' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-purple-600/20 text-purple-400'
                          }`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditUser(user)}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {user.role === 'athlete' && athleteByProfileId[user.id] && (
                              <button
                                onClick={() => router.push(`/coach/athlete/${athleteByProfileId[user.id].id}`)}
                                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center"><p className="text-slate-400">No users found matching your search.</p></div>
              )}
            </div>

            {/* ═══ EDIT USER MODAL ═══ */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-lg">Edit User</h3>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Avatar + Email (read-only) */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-700">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        ['admin', 'super_admin'].includes(editingUser.role) ? 'bg-red-500/20 text-red-400' :
                        editingUser.role === 'coach' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-purple-600/20 text-purple-400'
                      }`}>
                        {editingUser.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{editingUser.full_name}</p>
                        <p className="text-slate-400 text-sm">{editingUser.email}</p>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-500"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                      {editingUser.id === profile?.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded capitalize">{editingUser.role.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-500">Cannot change your own role</span>
                        </div>
                      ) : (
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="athlete">Athlete</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      )}
                    </div>

                    {/* Password Reset */}
                    <div className="pt-2 border-t border-slate-700">
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                      {resetEmailSent ? (
                        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                          <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <p className="text-green-400 text-sm">Reset link sent to <strong>{resetEmailSent}</strong></p>
                        </div>
                      ) : (
                        <button
                          onClick={sendPasswordReset}
                          disabled={sendingReset}
                          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {sendingReset ? 'Sending...' : 'Send Password Reset Email'}
                        </button>
                      )}
                      <p className="text-xs text-slate-500 mt-1.5">Sends a reset link to the user&#39;s email address.</p>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  {editingUser.id !== profile?.id && (
                    <div className="px-6 py-4 border-t border-red-500/20">
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">Danger Zone</p>
                      <button
                        onClick={() => setConfirmDelete(editingUser)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete this user permanently
                      </button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUserEdits}
                      disabled={savingUser || !editForm.full_name.trim()}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {savingUser ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-slate-800 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
                    <p className="text-slate-400 text-sm mb-1">Are you sure you want to permanently delete:</p>
                    <p className="text-white font-semibold mb-1">{confirmDelete.full_name}</p>
                    <p className="text-slate-500 text-sm mb-4">{confirmDelete.email}</p>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                      <p className="text-red-400 text-xs">This action cannot be undone. All of this user&apos;s data including meal logs, check-ins, and profile information will be permanently removed.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteUser}
                        disabled={deletingUser}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingUser ? 'Deleting...' : 'Yes, Delete User'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ NUTRITION TAB ═══ */}
        {activeTab === 'nutrition' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Nutrition Overview</h3>
              <p className="text-slate-400 text-sm mb-6">View all athlete nutrition plans and daily intake at a glance.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Athletes with Plans</p>
                <p className="text-2xl font-bold mt-1">
                  <span className="text-green-400">{nutritionRecs.length}</span>
                  <span className="text-slate-500 text-sm font-normal"> / {athletes.length}</span>
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Logged Meals Today</p>
                <p className="text-2xl font-bold mt-1">
                  <span className={stats.loggedToday > 0 ? 'text-green-400' : 'text-slate-500'}>{stats.loggedToday}</span>
                  <span className="text-slate-500 text-sm font-normal"> athletes</span>
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Without Plans</p>
                <p className="text-2xl font-bold mt-1">
                  <span className={athletes.length - nutritionRecs.length > 0 ? 'text-orange-400' : 'text-green-400'}>
                    {athletes.length - nutritionRecs.length}
                  </span>
                  <span className="text-slate-500 text-sm font-normal"> athletes</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h4 className="text-white font-semibold">All Athlete Nutrition Plans</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Athlete</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Daily Calories</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Protein</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Carbs</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Fat</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Today&#39;s Intake</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {athletes.map(athlete => {
                      const prof = profileByAthleteId[athlete.id]
                      const rec = recByAthleteId[athlete.id]
                      const athleteMealsToday = todayMeals.filter(m => m.athlete_id === athlete.id)
                      const todayCals = athleteMealsToday.reduce((sum, m) => sum + (m.calories || 0), 0)
                      const todayPro = athleteMealsToday.reduce((sum, m) => sum + (m.protein || 0), 0)
                      const calPct = rec ? Math.round((todayCals / rec.daily_calories) * 100) : 0

                      return (
                        <tr key={athlete.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm font-medium">{prof?.full_name || 'Unknown'}</p>
                              <p className="text-slate-500 text-xs">{formatSport(athlete.sport)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm font-mono">
                            {rec ? `${rec.daily_calories}` : <span className="text-orange-400">No plan</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm font-mono">
                            {rec ? `${rec.daily_protein_g}g` : '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm font-mono hidden md:table-cell">
                            {rec ? `${rec.daily_carbs_g}g` : '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm font-mono hidden md:table-cell">
                            {rec ? `${rec.daily_fat_g}g` : '\u2014'}
                          </td>
                          <td className="px-4 py-3">
                            {athleteMealsToday.length > 0 ? (
                              <span className="text-white text-sm font-mono">{todayCals} cal / {todayPro}g pro</span>
                            ) : (
                              <span className="text-slate-500 text-xs">Not logged</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!rec ? (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Needs Plan</span>
                            ) : calPct >= 80 ? (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">On Track ({calPct}%)</span>
                            ) : calPct > 0 ? (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Partial ({calPct}%)</span>
                            ) : (
                              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">No meals today</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {athletes.length === 0 && (
                <div className="p-8 text-center"><p className="text-slate-400">No athletes found.</p></div>
              )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h4 className="text-white font-semibold mb-2">Supplementation Guidance</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Athletes can log supplements through their daily check-in. As admin, you can view all supplement logs and
                provide guidance through the coach notes system. Use the athlete detail page to add private notes about
                supplementation recommendations for individual athletes.
              </p>
            </div>
          </div>
        )}

        {/* ═══ BILLING TAB ═══ */}
        {activeTab === 'billing' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-6">Billing Overview</h3>
            
            {/* Billing Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Teams</p>
                <p className="text-2xl font-bold text-white">{teams.length}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Athletes</p>
                <p className="text-2xl font-bold text-white">{profiles.filter(p => p.role === 'athlete').length}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Price/Athlete</p>
                <p className="text-2xl font-bold text-green-400">$20</p>
                <p className="text-xs text-slate-500">per month</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Est. Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-400">${(profiles.filter(p => p.role === 'athlete').length * 20).toLocaleString()}</p>
              </div>
            </div>

            {/* Team Billing Status */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-slate-700">
                <h4 className="text-white font-semibold">Team Subscription Status</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-5 py-3 text-slate-400 font-medium">Team</th>
                      <th className="text-left px-5 py-3 text-slate-400 font-medium">Coach</th>
                      <th className="text-center px-5 py-3 text-slate-400 font-medium">Athletes</th>
                      <th className="text-center px-5 py-3 text-slate-400 font-medium">Status</th>
                      <th className="text-right px-5 py-3 text-slate-400 font-medium hidden sm:table-cell">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map(team => {
                      const coach = profiles.find(p => p.id === team.coach_id)
                      const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length
                      return (
                        <tr key={team.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{team.name}</p>
                            <p className="text-slate-500 text-xs">{team.sport || 'No sport'}</p>
                          </td>
                          <td className="px-5 py-3 text-slate-300">{coach?.full_name || 'Unknown'}</td>
                          <td className="px-5 py-3 text-center text-white font-medium">{memberCount}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs font-medium rounded-full">Check Stripe</span>
                          </td>
                          <td className="px-5 py-3 text-right text-white font-medium hidden sm:table-cell">${(memberCount * 20).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stripe Dashboard Link */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Stripe Dashboard</h4>
                  <p className="text-slate-400 text-sm mb-3">View detailed payment history, manage subscriptions, issue refunds, and download invoices from your Stripe dashboard.</p>
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Open Stripe Dashboard
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Payment Configuration Note */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
              <p className="text-blue-300 text-sm font-medium mb-1">Payment Processing</p>
              <p className="text-blue-400/70 text-sm">Payments are processed through Stripe under CrossFit Iron Flag, LLC. To switch to a different Stripe account (e.g., VerifydAthlete LLC), update the Stripe API keys in your Vercel environment variables.</p>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {activeTab === 'settings' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-6">System Settings</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h4 className="text-white font-semibold">Coach Permissions</h4>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-sm text-slate-300 mb-3">Allow coaches to adjust AI-generated nutrition recommendations</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleToggleCoachAdjustments}
                        disabled={savingSettings}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          allowCoachAdjustments ? 'bg-purple-600' : 'bg-slate-700'
                        } ${savingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          allowCoachAdjustments ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm font-medium text-white">
                        {allowCoachAdjustments ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400"><strong>When enabled:</strong> Coaches can modify nutrition recommendations for their athletes.</p>
                    <p className="text-xs text-slate-400 mt-2"><strong>When disabled:</strong> Coaches can only view AI-generated recommendations (read-only).</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h4 className="text-white font-semibold">System Information</h4>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Total Users</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.totalUsers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Athletes</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.totalAthletes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Coaches</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.totalCoaches}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Teams</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.totalTeams}</p>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400"><strong>Meal Logs:</strong> {stats.totalMeals} total &middot; <strong>Check-ins:</strong> {stats.totalCheckins} total</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden md:col-span-2">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h4 className="text-white font-semibold">Data Access Summary</h4>
                </div>
                <div className="p-5">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-2">Coaches Can See</h5>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>&bull; Aggregated daily macros (calories, protein, carbs, fat)</li>
                        <li>&bull; Wellness scores (energy, stress, soreness, sleep, hydration)</li>
                        <li>&bull; Compliance rates and streaks</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-2">Coaches Cannot See</h5>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>&bull; Meal names, descriptions, or photos</li>
                        <li>&bull; AI feedback on meals</li>
                        <li>&bull; Athlete private notes</li>
                        <li>&bull; Body weight or hunger levels</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white mb-2">Admins Can See</h5>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>&bull; All user profiles and roles</li>
                        <li>&bull; All meal logs and nutrition plans</li>
                        <li>&bull; All check-in data and wellness scores</li>
                        <li>&bull; Team memberships and assignments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
