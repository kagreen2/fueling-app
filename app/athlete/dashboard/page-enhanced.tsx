'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface AthleteStats {
  todayCalories: number
  todayProtein: number
  todayWater: number
  thisWeekMeals: number
  thisWeekCheckIns: number
  thisWeekHydration: number
  calorieGoal: number
  proteinGoal: number
  waterGoal: number
}

interface QuickAction {
  id: string
  icon: string
  label: string
  description: string
  href: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'checkin',
    icon: '✅',
    label: 'Daily Check-in',
    description: 'Log how you feel',
    href: '/athlete/checkin',
  },
  {
    id: 'meals',
    icon: '🍽️',
    label: 'Log a Meal',
    description: 'Photo or description',
    href: '/athlete/meals',
  },
  {
    id: 'hydration',
    icon: '💧',
    label: 'Hydration',
    description: 'Track water intake',
    href: '/athlete/hydration',
  },
  {
    id: 'supplements',
    icon: '💊',
    label: 'Supplements',
    description: 'Log & review',
    href: '/athlete/supplements',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export default function AthleteDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<AthleteStats>({
    todayCalories: 0,
    todayProtein: 0,
    todayWater: 0,
    thisWeekMeals: 0,
    thisWeekCheckIns: 0,
    thisWeekHydration: 0,
    calorieGoal: 2500,
    proteinGoal: 150,
    waterGoal: 100,
  })
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [todayCheckin, setTodayCheckin] = useState<any>(null)

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

      // Get athlete data
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (!athleteData) {
        router.push('/athlete/onboarding')
        return
      }

      // Get today's meals
      const today = new Date().toISOString().split('T')[0]
      const { data: mealsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('athlete_id', athleteData.id)
        .eq('date', today)
        .order('created_at', { ascending: false })

      if (mealsData) {
        const todayStats = mealsData.reduce((acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
        }), { calories: 0, protein: 0 })

        setStats(prev => ({
          ...prev,
          todayCalories: todayStats.calories,
          todayProtein: todayStats.protein,
        }))
        setRecentMeals(mealsData.slice(0, 3))
      }

      // Get today's hydration
      const { data: hydrationData } = await supabase
        .from('hydration_logs')
        .select('water_oz')
        .eq('athlete_id', athleteData.id)
        .eq('date', today)
        .single()

      if (hydrationData) {
        setStats(prev => ({
          ...prev,
          todayWater: hydrationData.water_oz || 0,
        }))
      }

      // Get today's check-in
      const { data: checkinData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('athlete_id', athleteData.id)
        .eq('date', today)
        .single()

      setTodayCheckin(checkinData || null)

      // Get this week stats
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data: weekMeals } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('athlete_id', athleteData.id)
        .gte('date', weekAgo)

      const { data: weekCheckins } = await supabase
        .from('daily_checkins')
        .select('id')
        .eq('athlete_id', athleteData.id)
        .gte('date', weekAgo)

      const { data: weekHydration } = await supabase
        .from('hydration_logs')
        .select('water_oz')
        .eq('athlete_id', athleteData.id)
        .gte('date', weekAgo)

      const weekHydrationTotal = weekHydration?.reduce((acc, log) => acc + (log.water_oz || 0), 0) || 0

      setStats(prev => ({
        ...prev,
        thisWeekMeals: weekMeals?.length || 0,
        thisWeekCheckIns: weekCheckins?.length || 0,
        thisWeekHydration: weekHydrationTotal,
      }))

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
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  const caloriePercent = Math.min((stats.todayCalories / stats.calorieGoal) * 100, 100)
  const proteinPercent = Math.min((stats.todayProtein / stats.proteinGoal) * 100, 100)
  const waterPercent = Math.min((stats.todayWater / stats.waterGoal) * 100, 100)

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
              {greeting()} 👋
            </h1>
          </div>
          <button
            onClick={() => router.push('/athlete/profile')}
            className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
          >
            👤
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Welcome Card */}
        {profile && (
          <Card className="mb-8 bg-gradient-to-br from-purple-600/10 to-purple-600/5 border-purple-600/20">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Welcome back,</p>
                  <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                </div>
                <div className="text-5xl">🎯</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Progress */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Today's Progress</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="flex justify-center">
              <ProgressRing
                percentage={caloriePercent}
                size={100}
                color="#9333EA"
                label="Calories"
                value={`${Math.round(stats.todayCalories)}`}
                unit="kcal"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                percentage={proteinPercent}
                size={100}
                color="#9333EA"
                label="Protein"
                value={`${Math.round(stats.todayProtein)}`}
                unit="g"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                percentage={waterPercent}
                size={100}
                color="#9333EA"
                label="Water"
                value={`${Math.round(stats.todayWater)}`}
                unit="oz"
              />
            </div>
          </div>

          {/* Macro Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard
              label="Calories"
              value={`${Math.round(stats.todayCalories)} / ${stats.calorieGoal}`}
              unit="kcal"
              icon="🔥"
              color="red"
            />
            <StatCard
              label="Protein"
              value={`${Math.round(stats.todayProtein)} / ${stats.proteinGoal}`}
              unit="g"
              icon="💪"
              color="green"
            />
            <StatCard
              label="Water"
              value={`${Math.round(stats.todayWater)} / ${stats.waterGoal}`}
              unit="oz"
              icon="💧"
              color="blue"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => router.push(action.href)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left transition-all duration-200 active:scale-95 hover:border-purple-600/50 hover:bg-slate-700/50"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <h4 className="font-semibold text-sm text-white">{action.label}</h4>
                <p className="text-xs text-slate-400 mt-1">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* This Week Stats */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">This Week</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Meals Logged</p>
                    <p className="text-3xl font-bold text-white">{stats.thisWeekMeals}</p>
                  </div>
                  <div className="text-4xl">🍽️</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Check-ins</p>
                    <p className="text-3xl font-bold text-white">{stats.thisWeekCheckIns}</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Water Intake</p>
                    <p className="text-3xl font-bold text-white">{Math.round(stats.thisWeekHydration)}</p>
                    <p className="text-xs text-slate-400 mt-1">oz</p>
                  </div>
                  <div className="text-4xl">💧</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Today's Check-in Status */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Daily Check-in</h3>
          {todayCheckin ? (
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">✅ Check-in Complete</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Energy</p>
                        <p className="text-lg font-bold text-white">{todayCheckin.energy}/10</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sleep</p>
                        <p className="text-lg font-bold text-white">{todayCheckin.sleep_hours}h</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-5xl">🎉</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">⏰ Pending</p>
                    <p className="text-white">Complete your daily check-in to track your progress</p>
                  </div>
                  <Button
                    onClick={() => router.push('/athlete/checkin')}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Check-in Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Meals */}
        {recentMeals.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Recent Meals</h3>
            <div className="space-y-3">
              {recentMeals.map((meal, i) => (
                <Card key={i}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{meal.meal_title}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                          {meal.calories} cal • {meal.protein}g protein • {meal.carbs}g carbs
                        </p>
                      </div>
                      <div className="text-2xl">🍽️</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
