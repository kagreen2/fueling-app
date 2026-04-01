'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'
import ChatPanel from '@/components/ChatPanel'
import LightningBolt from '@/components/ui/LightningBolt'
import WellnessSpotlight from '@/components/WellnessSpotlight'

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
  {
    id: 'biometrics',
    icon: '📊',
    label: 'Body Comp',
    description: 'InBody scans',
    href: '/athlete/biometrics',
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
    calorieGoal: 0,
    proteinGoal: 0,
    waterGoal: 100,
  })
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [todayCheckin, setTodayCheckin] = useState<any>(null)
  const [recentCheckins, setRecentCheckins] = useState<Array<{ date: string; wellness_score: number | null }>>([])
  const [refreshing, setRefreshing] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [athlete, setAthlete] = useState<any>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [userId, setUserId] = useState<string>('')
  const [coachProfile, setCoachProfile] = useState<{ id: string; full_name: string; email: string } | null>(null)
  const [loadError, setLoadError] = useState(false)

  const TUTORIAL_SLIDES = [
    {
      icon: '👋',
      title: 'Welcome to Fuel Different!',
      description: 'Your personalized nutrition dashboard is ready. Let\'s walk through the basics so you can get the most out of the app.',
    },
    {
      icon: '✅',
      title: 'Daily Check-in',
      description: 'Start each day with a quick check-in. Rate your energy, soreness, hunger, and stress levels so your coach can monitor how you\'re feeling.',
    },
    {
      icon: '🍽️',
      title: 'Log Your Meals',
      description: 'Snap a photo or describe your meals to track your daily nutrition. The app will calculate your calories, protein, carbs, and fat automatically.',
    },
    {
      icon: '💧',
      title: 'Track Hydration',
      description: 'Log your water intake throughout the day. Staying hydrated is key to performance and recovery.',
    },
    {
      icon: '🎯',
      title: 'Hit Your Targets',
      description: 'Your personalized macro targets are based on your body, sport, and goals. Check the progress rings on your dashboard to see how you\'re tracking each day.',
    },
    {
      icon: '💊',
      title: 'Supplements',
      description: 'Before taking any supplement, submit it for review. Your coach will approve or flag supplements to keep you safe and compliant.',
    },
    {
      icon: '🚀',
      title: 'You\'re All Set!',
      description: 'That\'s it! Start by doing your daily check-in and logging your first meal. Your coach will be able to see your progress and provide guidance.',
    },
  ]

  useEffect(() => {
    // Check if this is the athlete's first time viewing the dashboard
    const tutorialSeen = localStorage.getItem('fuel_tutorial_seen')
    if (!tutorialSeen) {
      setShowTutorial(true)
    }
  }, [])

  function dismissTutorial() {
    localStorage.setItem('fuel_tutorial_seen', 'true')
    setShowTutorial(false)
    setTutorialStep(0)
  }

  useEffect(() => {
    loadData()
    
    // Subscribe to real-time meal updates
    const subscription = supabase
      .channel('meal-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meal_logs',
        },
        (payload) => {
          // Reload data when a new meal is logged
          loadData()
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
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

      setAthlete(athleteData)
      setUserId(user.id)

      // Check for coach assignment (for chat)
      const { data: coachAssignment } = await supabase
        .from('athlete_coach_assignments')
        .select('coach_id')
        .eq('athlete_id', athleteData.id)
        .limit(1)
        .single()

      if (coachAssignment) {
        const { data: coachProf } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', coachAssignment.coach_id)
          .single()
        if (coachProf) setCoachProfile(coachProf)
      } else {
        // Check team-based coach
        const { data: teamMembership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('athlete_id', athleteData.id)
          .limit(1)
          .single()

        if (teamMembership) {
          const { data: team } = await supabase
            .from('teams')
            .select('coach_id')
            .eq('id', teamMembership.team_id)
            .single()

          if (team?.coach_id) {
            const { data: coachProf } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', team.coach_id)
              .single()
            if (coachProf) setCoachProfile(coachProf)
          }
        }
      }

      // Get nutrition recommendations
      const { data: recsData } = await supabase
        .from('nutrition_recommendations')
        .select('*')
        .eq('athlete_id', athleteData.id)
        .single()

      if (recsData) {
        setRecommendations(recsData)
        // Update stats with recommendation goals
        setStats(prev => ({
          ...prev,
          calorieGoal: recsData.daily_calories,
          proteinGoal: recsData.daily_protein_g,
        }))
      }

      // Get today's meals (use local date to avoid timezone issues)
      const { getLocalDateString } = await import('@/lib/utils/date')
      const today = getLocalDateString()
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

      // Get last 14 days of check-ins for WellnessSpotlight
      const twoWeeksAgo = getLocalDateString(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      const { data: recentCheckinData } = await supabase
        .from('daily_checkins')
        .select('date, wellness_score')
        .eq('athlete_id', athleteData.id)
        .gte('date', twoWeeksAgo)
        .order('date', { ascending: false })
      setRecentCheckins(recentCheckinData || [])

      // Get this week stats
      const weekAgo = getLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      
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
      setLoadError(true)
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to load dashboard</h2>
          <p className="text-slate-400 text-sm mb-6">Check your connection and try again.</p>
          <button
            onClick={() => { setLoadError(false); setLoading(true); loadData(); }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LightningBolt className="w-10 h-10 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  const caloriePercent = stats.calorieGoal > 0 ? Math.min((stats.todayCalories / stats.calorieGoal) * 100, 100) : 0
  const proteinPercent = stats.proteinGoal > 0 ? Math.min((stats.todayProtein / stats.proteinGoal) * 100, 100) : 0
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
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="flex justify-center">
              <ProgressRing
                percentage={caloriePercent}
                size={90}
                color="#9333EA"
                label="Calories"
                value={`${Math.round(stats.todayCalories)}`}
                unit="kcal"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                percentage={proteinPercent}
                size={90}
                color="#9333EA"
                label="Protein"
                value={`${Math.round(stats.todayProtein)}`}
                unit="g"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                percentage={waterPercent}
                size={90}
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
              value={`${Math.round(stats.todayCalories)} / ${stats.calorieGoal > 0 ? stats.calorieGoal : '—'}`}
              unit="kcal"
              icon="🔥"
              color="red"
            />
            <StatCard
              label="Protein"
              value={`${Math.round(stats.todayProtein)} / ${stats.proteinGoal > 0 ? stats.proteinGoal : '—'}`}
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

        {/* Wellness Spotlight */}
        <div className="mb-8">
          <WellnessSpotlight checkins={recentCheckins} role="athlete" />
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
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Energy</p>
                        <p className="text-lg font-bold text-white">{todayCheckin.energy}/10</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sleep</p>
                        <p className="text-lg font-bold text-white">{todayCheckin.sleep_hours}h</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Stress</p>
                        <p className={`text-lg font-bold ${todayCheckin.stress <= 3 ? 'text-green-400' : todayCheckin.stress <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{todayCheckin.stress}/10</p>
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

        {/* Personalized Nutrition Targets */}
        {recommendations && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider mb-4">Your Personalized Targets</h3>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
              <CardContent>
                <div className="space-y-4">
                  {/* Daily Targets */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-2">Daily Calories</p>
                      <p className="text-3xl font-bold text-purple-400">{recommendations.daily_calories}</p>
                      <p className="text-xs text-slate-500 mt-2">Current: {Math.round(stats.todayCalories)}</p>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                          style={{ width: `${Math.min((stats.todayCalories / recommendations.daily_calories) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-2">Daily Protein</p>
                      <p className="text-3xl font-bold text-blue-400">{recommendations.daily_protein_g}g</p>
                      <p className="text-xs text-slate-500 mt-2">Current: {Math.round(stats.todayProtein)}g</p>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min((stats.todayProtein / recommendations.daily_protein_g) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-2">Carbs & Fat</p>
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-purple-400 font-medium">{recommendations.daily_carbs_g}g</p>
                          <p className="text-xs text-slate-500">Carbs</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-yellow-400 font-medium">{recommendations.daily_fat_g}g</p>
                          <p className="text-xs text-slate-500">Fat</p>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-700">
                        <div className="bg-purple-500 flex-1" />
                        <div className="bg-yellow-500 flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Meals */}
        {recentMeals.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300 uppercase tracking-wider">Recent Meals</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/athlete/meals/history')}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  View All
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {recentMeals.map((meal, i) => {
                const totalMacros = (meal.protein || 0) + (meal.carbs || 0) + (meal.fat || 0)
                const proteinPct = totalMacros > 0 ? ((meal.protein || 0) / totalMacros) * 100 : 0
                const carbsPct = totalMacros > 0 ? ((meal.carbs || 0) / totalMacros) * 100 : 0
                const fatPct = totalMacros > 0 ? ((meal.fat || 0) / totalMacros) * 100 : 0
                
                return (
                  <Card key={i} className="hover:border-purple-600/50 transition-all">
                    <CardContent>
                      <div className="space-y-3">
                        {/* Title and confidence */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white text-lg">{meal.meal_title}</h4>
                            {meal.confidence && (
                              <span className={`text-xs font-medium mt-1 inline-block px-2 py-1 rounded ${
                                meal.confidence === 'high' ? 'bg-green-500/20 text-green-300' :
                                meal.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-purple-500/20 text-purple-300'
                              }`}>
                                {meal.confidence === 'high' ? '✓ High confidence' :
                                 meal.confidence === 'medium' ? '~ Medium confidence' :
                                 '? Low confidence'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-400">{meal.calories}</p>
                            <p className="text-xs text-slate-400">calories</p>
                          </div>
                        </div>

                        {/* Macro breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-slate-700/50 rounded-lg p-2">
                            <p className="text-slate-400 text-xs">Protein</p>
                            <p className="font-semibold text-white">{meal.protein || 0}g</p>
                            <div className="text-xs text-slate-500 mt-1">{Math.round(proteinPct)}%</div>
                          </div>
                          <div className="bg-slate-700/50 rounded-lg p-2">
                            <p className="text-slate-400 text-xs">Carbs</p>
                            <p className="font-semibold text-white">{meal.carbs || 0}g</p>
                            <div className="text-xs text-slate-500 mt-1">{Math.round(carbsPct)}%</div>
                          </div>
                          <div className="bg-slate-700/50 rounded-lg p-2">
                            <p className="text-slate-400 text-xs">Fat</p>
                            <p className="font-semibold text-white">{meal.fat || 0}g</p>
                            <div className="text-xs text-slate-500 mt-1">{Math.round(fatPct)}%</div>
                          </div>
                        </div>

                        {/* Macro progress bar */}
                        <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
                          <div
                            className="bg-blue-500"
                            style={{ width: `${proteinPct}%` }}
                            title="Protein"
                          />
                          <div
                            className="bg-purple-500"
                            style={{ width: `${carbsPct}%` }}
                            title="Carbs"
                          />
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${fatPct}%` }}
                            title="Fat"
                          />
                        </div>

                        {/* AI feedback */}
                        {meal.ai_feedback && (
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <p className="text-xs text-purple-300 font-medium mb-1">💡 Coach's Feedback</p>
                            <p className="text-sm text-slate-300">{meal.ai_feedback}</p>
                          </div>
                        )}

                        {/* Next step */}
                        {meal.ai_next_step && (
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-xs text-slate-400 font-medium mb-1">Next Step</p>
                            <p className="text-sm text-slate-200">{meal.ai_next_step}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {/* Coach Chat */}
      {athlete && userId && coachProfile && (
        <div className="mt-6">
          <ChatPanel
            athleteId={athlete.id}
            currentUserId={userId}
            otherUserId={coachProfile.id}
            otherUserName={coachProfile.full_name || 'Your Coach'}
            otherUserRole="Coach"
            senderName={profile?.full_name || 'Athlete'}
            senderRole={profile?.role || 'athlete'}
            otherUserEmail={coachProfile.email}
            compact
          />
        </div>
      )}

      {/* Tutorial Slideshow Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pt-5 pb-2">
              {TUTORIAL_SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === tutorialStep ? 'w-6 bg-purple-500' : i < tutorialStep ? 'w-1.5 bg-purple-500/50' : 'w-1.5 bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Slide content */}
            <div className="px-8 py-6 text-center">
              <div className="text-5xl mb-4">{TUTORIAL_SLIDES[tutorialStep].icon}</div>
              <h2 className="text-xl font-bold text-white mb-3">{TUTORIAL_SLIDES[tutorialStep].title}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{TUTORIAL_SLIDES[tutorialStep].description}</p>
            </div>

            {/* Navigation */}
            <div className="px-8 pb-6 flex items-center justify-between">
              {tutorialStep > 0 ? (
                <button
                  onClick={() => setTutorialStep(s => s - 1)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={dismissTutorial}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Skip
                </button>
              )}
              {tutorialStep < TUTORIAL_SLIDES.length - 1 ? (
                <button
                  onClick={() => setTutorialStep(s => s + 1)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={dismissTutorial}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
