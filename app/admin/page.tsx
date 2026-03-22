'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Input } from '@/components/ui/Input'

interface AdminStats {
  totalUsers: number
  totalAthletes: number
  totalCoaches: number
  totalAdmins: number
  totalMeals: number
  totalSupplements: number
  totalAlerts: number
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAthletes: 0,
    totalCoaches: 0,
    totalAdmins: 0,
    totalMeals: 0,
    totalSupplements: 0,
    totalAlerts: 0,
  })
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'assignments'>('overview')
  const [athletes, setAthletes] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [athleteCoachMap, setAthleteCoachMap] = useState<Record<string, string>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Check if admin
      if (!profileData || !['admin', 'super_admin'].includes(profileData.role)) {
        router.push('/athlete/dashboard')
        return
      }

      // Get all users
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (allProfiles) {
        setUsers(allProfiles)

        const athleteCount = allProfiles.filter(p => p.role === 'athlete').length
        const coachCount = allProfiles.filter(p => p.role === 'coach').length
        const adminCount = allProfiles.filter(p => ['admin', 'super_admin'].includes(p.role)).length

        // Get meal stats
        const { data: mealsData, count: mealsCount } = await supabase
          .from('meal_logs')
          .select('id', { count: 'exact' })

        // Get supplement stats
        const { data: supplementsData, count: supplementsCount } = await supabase
          .from('supplements')
          .select('id', { count: 'exact' })

        // Get alerts stats
        const { data: alertsData, count: alertsCount } = await supabase
          .from('alerts')
          .select('id', { count: 'exact' })

      setStats({
        totalUsers: allProfiles.length,
        totalAthletes: athleteCount,
        totalCoaches: coachCount,
        totalAdmins: adminCount,
        totalMeals: mealsCount || 0,
        totalSupplements: supplementsCount || 0,
        totalAlerts: alertsCount || 0,
      })

      // Load athletes and coaches for assignment
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('id, profile_id, profiles!athletes_profile_id_fkey(full_name, email)')

      const { data: coachesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'coach')

      if (athletesData) setAthletes(athletesData)
      if (coachesData) setCoaches(coachesData)

      // Load current assignments
      const { data: assignmentsData } = await supabase
        .from('athlete_coach_assignments')
        .select('athlete_id, coach_id')

      if (assignmentsData) {
        const map: Record<string, string> = {}
        assignmentsData.forEach((assignment: any) => {
          map[assignment.athlete_id] = assignment.coach_id
        })
        setAthleteCoachMap(map)
      }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (!error) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        ))
        
        // Update stats
        const athleteCount = users.filter(p => p.role === 'athlete').length
        const coachCount = users.filter(p => p.role === 'coach').length
        const adminCount = users.filter(p => ['admin', 'super_admin'].includes(p.role)).length

        setStats(prev => ({
          ...prev,
          totalAthletes: athleteCount,
          totalCoaches: coachCount,
          totalAdmins: adminCount,
        }))
      }
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== userId))
        loadData() // Reload stats
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </main>
    )
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">{profile?.full_name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/coach')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                👥 Coach Dashboard
              </button>
              <button
                onClick={() => router.push('/athlete/profile')}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
              >
                👤
              </button>
            </div>
          </div>

          {/* Tabs and Navigation */}
          <div className="flex gap-2 border-b border-slate-800 -mb-4">
            {['overview', 'users', 'analytics', 'assignments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* System Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                unit="accounts"
                icon="👥"
                color="blue"
              />
              <StatCard
                label="Athletes"
                value={stats.totalAthletes}
                unit="active"
                icon="🏃"
                color="green"
              />
              <StatCard
                label="Coaches"
                value={stats.totalCoaches}
                unit="staff"
                icon="👨‍🏫"
                color="orange"
              />
              <StatCard
                label="Admins"
                value={stats.totalAdmins}
                unit="super users"
                icon="🔐"
                color="red"
              />
            </div>

            {/* Activity Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Total Meals Logged</p>
                      <p className="text-4xl font-bold text-white">{stats.totalMeals}</p>
                    </div>
                    <div className="text-4xl">🍽️</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Supplements Logged</p>
                      <p className="text-4xl font-bold text-white">{stats.totalSupplements}</p>
                    </div>
                    <div className="text-4xl">💊</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">System Alerts</p>
                      <p className="text-4xl font-bold text-white">{stats.totalAlerts}</p>
                    </div>
                    <div className="text-4xl">⚠️</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">User Management</p>
                        <p className="text-lg font-semibold text-white">Manage Accounts</p>
                      </div>
                      <div className="text-3xl">👥</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">System Health</p>
                        <p className="text-lg font-semibold text-white">View Status</p>
                      </div>
                      <div className="text-3xl">🏥</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">Reports</p>
                        <p className="text-lg font-semibold text-white">Export Data</p>
                      </div>
                      <div className="text-3xl">📊</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">User Management</h3>
              
              {/* Search and Filter */}
              <div className="flex gap-4 mb-6">
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
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <Card key={user.id}>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-lg">{user.full_name}</h4>
                          <p className="text-sm text-slate-400 mt-1">{user.email}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            disabled={updatingId === user.id}
                            className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-600 text-sm"
                          >
                            <option value="athlete">Athlete</option>
                            <option value="coach">Coach</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <Card>
                  <CardContent>
                    <p className="text-slate-400 text-center py-8">No users found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">System Analytics</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Distribution */}
              <Card>
                <CardHeader title="User Distribution" />
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">Athletes</span>
                        <span className="text-sm font-semibold text-white">
                          {stats.totalAthletes} ({Math.round((stats.totalAthletes / stats.totalUsers) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(stats.totalAthletes / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">Coaches</span>
                        <span className="text-sm font-semibold text-white">
                          {stats.totalCoaches} ({Math.round((stats.totalCoaches / stats.totalUsers) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${(stats.totalCoaches / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">Admins</span>
                        <span className="text-sm font-semibold text-white">
                          {stats.totalAdmins} ({Math.round((stats.totalAdmins / stats.totalUsers) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(stats.totalAdmins / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card>
                <CardHeader title="Activity Summary" />
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                      <span className="text-slate-400">Meals Logged</span>
                      <span className="text-2xl font-bold text-white">{stats.totalMeals}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                      <span className="text-slate-400">Supplements</span>
                      <span className="text-2xl font-bold text-white">{stats.totalSupplements}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">System Alerts</span>
                      <span className="text-2xl font-bold text-white">{stats.totalAlerts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Athlete-Coach Assignments</h3>
            
            {athletes.length > 0 ? (
              <div className="space-y-3">
                {athletes.map(athlete => {
                  const athleteName = (athlete.profiles as any)?.full_name || 'Unknown'
                  const athleteEmail = (athlete.profiles as any)?.email || ''
                  const assignedCoachId = athleteCoachMap[athlete.id]
                  const assignedCoach = coaches.find(c => c.id === assignedCoachId)

                  return (
                    <Card key={athlete.id}>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-lg">{athleteName}</h4>
                            <p className="text-sm text-slate-400 mt-1">{athleteEmail}</p>
                            {assignedCoach && (
                              <p className="text-xs text-purple-400 mt-2">Assigned to: {assignedCoach.full_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={assignedCoachId || ''}
                              onChange={async (e) => {
                                setAssigningId(athlete.id)
                                const coachId = e.target.value
                                
                                try {
                                  if (coachId) {
                                    // Check if assignment exists
                                    const { data: existing } = await supabase
                                      .from('athlete_coach_assignments')
                                      .select('id')
                                      .eq('athlete_id', athlete.id)
                                      .single()

                                    if (existing) {
                                      // Update existing
                                      await supabase
                                        .from('athlete_coach_assignments')
                                        .update({ coach_id: coachId })
                                        .eq('athlete_id', athlete.id)
                                    } else {
                                      // Create new
                                      await supabase
                                        .from('athlete_coach_assignments')
                                        .insert({
                                          athlete_id: athlete.id,
                                          coach_id: coachId,
                                        })
                                    }

                                    // Update local state
                                    setAthleteCoachMap(prev => ({
                                      ...prev,
                                      [athlete.id]: coachId,
                                    }))
                                  } else {
                                    // Remove assignment
                                    await supabase
                                      .from('athlete_coach_assignments')
                                      .delete()
                                      .eq('athlete_id', athlete.id)

                                    setAthleteCoachMap(prev => {
                                      const newMap = { ...prev }
                                      delete newMap[athlete.id]
                                      return newMap
                                    })
                                  }
                                } catch (error) {
                                  console.error('Error assigning coach:', error)
                                } finally {
                                  setAssigningId(null)
                                }
                              }}
                              disabled={assigningId === athlete.id}
                              className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-purple-600 text-sm"
                            >
                              <option value="">-- No Coach --</option>
                              {coaches.map(coach => (
                                <option key={coach.id} value={coach.id}>
                                  {coach.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-slate-400 text-center py-8">No athletes found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
