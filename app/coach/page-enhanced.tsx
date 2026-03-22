'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'

interface CoachStats {
  totalAthletes: number
  activeToday: number
  pendingReviews: number
  alertsCount: number
}

interface AthleteStatus {
  id: string
  name: string
  sport: string
  position: string
  lastCheckin: string
  energy: number
  hydrationStatus: number
  mealsLogged: number
  supplementsPending: number
}

export default function CoachDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<CoachStats>({
    totalAthletes: 0,
    activeToday: 0,
    pendingReviews: 0,
    alertsCount: 0,
  })
  const [athletes, setAthletes] = useState<AthleteStatus[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'athletes' | 'supplements' | 'alerts'>('overview')
  const [supplements, setSupplements] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

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

      // Check if coach
      if (!profileData || !['coach', 'admin', 'super_admin'].includes(profileData.role)) {
        router.push('/athlete/dashboard')
        return
      }

      // Get coach's team
      const { data: staffData } = await supabase
        .from('staff')
        .select('team_id')
        .eq('profile_id', user.id)
        .single()

      if (!staffData?.team_id) {
        setLoading(false)
        return
      }

      // Get team athletes
      const { data: athleteData } = await supabase
        .from('athletes')
        .select(`
          id,
          profile_id,
          sport,
          position,
          profiles!athletes_profile_id_fkey(full_name, id)
        `)
        .eq('team_id', staffData.team_id)

      if (athleteData) {
        // Get stats for each athlete
        const athleteStats: AthleteStatus[] = []
        const today = new Date().toISOString().split('T')[0]

        for (const athlete of athleteData) {
          const { data: checkinData } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('athlete_id', athlete.id)
            .eq('date', today)
            .single()

          const { data: mealsData } = await supabase
            .from('meal_logs')
            .select('id')
            .eq('athlete_id', athlete.id)
            .eq('date', today)

          const { data: supplementsData } = await supabase
            .from('supplements')
            .select('id')
            .eq('athlete_id', athlete.id)
            .eq('status', 'pending')

          athleteStats.push({
            id: athlete.id,
            name: athlete.profiles.full_name,
            sport: athlete.sport || 'Unknown',
            position: athlete.position || 'N/A',
            lastCheckin: checkinData?.created_at || 'No check-in',
            energy: checkinData?.energy || 0,
            hydrationStatus: checkinData?.hydration_status || 0,
            mealsLogged: mealsData?.length || 0,
            supplementsPending: supplementsData?.length || 0,
          })
        }

        setAthletes(athleteStats)

        // Count active today
        const activeCount = athleteStats.filter(a => a.lastCheckin !== 'No check-in').length
        setStats(prev => ({
          ...prev,
          totalAthletes: athleteStats.length,
          activeToday: activeCount,
        }))
      }

      // Get pending supplements
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

      if (suppData) {
        setSupplements(suppData)
        setStats(prev => ({
          ...prev,
          pendingReviews: suppData.length,
        }))
      }

      // Get alerts
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

      if (alertData) {
        setAlerts(alertData)
        setStats(prev => ({
          ...prev,
          alertsCount: alertData.length,
        }))
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-slate-400">Loading coach dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                Coach Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">{profile?.full_name}</p>
            </div>
            <button
              onClick={() => router.push('/athlete/profile')}
              className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
            >
              👤
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800 -mb-4">
            {['overview', 'athletes', 'supplements', 'alerts'].map(tab => (
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Athletes"
                value={stats.totalAthletes}
                unit=""
                icon="👥"
                color="blue"
              />
              <StatCard
                label="Active Today"
                value={stats.activeToday}
                unit={`of ${stats.totalAthletes}`}
                icon="✅"
                color="green"
              />
              <StatCard
                label="Pending Reviews"
                value={stats.pendingReviews}
                unit="supplements"
                icon="💊"
                color="orange"
              />
              <StatCard
                label="Alerts"
                value={stats.alertsCount}
                unit="unresolved"
                icon="⚠️"
                color="red"
              />
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Team Management</p>
                      <p className="text-lg font-semibold text-white">Manage Athletes</p>
                    </div>
                    <div className="text-3xl">👥</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Nutrition</p>
                      <p className="text-lg font-semibold text-white">Review Meals</p>
                    </div>
                    <div className="text-3xl">🍽️</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-purple-600/50 transition-all cursor-pointer">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Analytics</p>
                      <p className="text-lg font-semibold text-white">View Reports</p>
                    </div>
                    <div className="text-3xl">📊</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Recent Activity</h3>
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    {athletes.slice(0, 5).map(athlete => (
                      <div key={athlete.id} className="flex items-center justify-between pb-4 border-b border-slate-700 last:border-0">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{athlete.name}</h4>
                          <p className="text-sm text-slate-400">{athlete.sport} • {athlete.position}</p>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-slate-400">Energy</p>
                            <p className="font-bold text-white">{athlete.energy}/10</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400">Meals</p>
                            <p className="font-bold text-white">{athlete.mealsLogged}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Athletes Tab */}
        {activeTab === 'athletes' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Team Athletes</h3>
            <div className="space-y-3">
              {athletes.map(athlete => (
                <Card key={athlete.id} className="hover:border-purple-600/50 transition-all cursor-pointer">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-lg">{athlete.name}</h4>
                        <p className="text-sm text-slate-400 mt-1">{athlete.sport} • {athlete.position}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-center">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Energy</p>
                          <p className="text-lg font-bold text-white">{athlete.energy}/10</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Hydration</p>
                          <p className="text-lg font-bold text-white">{athlete.hydrationStatus}/10</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Meals</p>
                          <p className="text-lg font-bold text-white">{athlete.mealsLogged}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Pending</p>
                          <p className="text-lg font-bold text-yellow-400">{athlete.supplementsPending}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Supplements Tab */}
        {activeTab === 'supplements' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Pending Supplement Reviews</h3>
            {supplements.length > 0 ? (
              <div className="space-y-3">
                {supplements.map(supp => (
                  <Card key={supp.id} className="border-yellow-500/20 bg-yellow-500/5">
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{supp.supplement_name}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            Athlete: {supp.athletes?.profiles?.full_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-2">{supp.notes}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-slate-400 text-center py-8">No pending supplement reviews</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Active Alerts</h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <Card key={alert.id} className="border-red-500/20 bg-red-500/5">
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{alert.alert_type}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            Athlete: {alert.athletes?.profiles?.full_name}
                          </p>
                          <p className="text-sm text-red-400 mt-2">{alert.message}</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Resolve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-slate-400 text-center py-8">No active alerts</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
