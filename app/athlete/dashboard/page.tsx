'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import ChatPanel from '@/components/ChatPanel'
import LightningBolt from '@/components/ui/LightningBolt'
import WellnessSpotlight from '@/components/WellnessSpotlight'
import { calculateFuelScore } from '@/lib/fuel-score'

interface AthleteStats {
  todayCalories: number
  todayProtein: number
  todayCarbs: number
  todayFat: number
  todayWater: number
  thisWeekMeals: number
  thisWeekCheckIns: number
  thisWeekHydration: number
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
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
    todayCarbs: 0,
    todayFat: 0,
    todayWater: 0,
    thisWeekMeals: 0,
    thisWeekCheckIns: 0,
    thisWeekHydration: 0,
    calorieGoal: 0,
    proteinGoal: 0,
    carbsGoal: 0,
    fatGoal: 0,
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
  const [showChat, setShowChat] = useState(false)
  const [showCheckinReminder, setShowCheckinReminder] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const mainRef = useRef<HTMLDivElement>(null)

  const PULL_THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current
    if (diff > 0 && mainRef.current && mainRef.current.scrollTop <= 0) {
      setPullDistance(Math.min(diff * 0.5, 120))
    }
  }, [isPulling])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setPullDistance(PULL_THRESHOLD)
      await handleRefresh()
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, refreshing])

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
          carbsGoal: recsData.daily_carbs_g,
          fatGoal: recsData.daily_fat_g,
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
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

        setStats(prev => ({
          ...prev,
          todayCalories: todayStats.calories,
          todayProtein: todayStats.protein,
          todayCarbs: todayStats.carbs,
          todayFat: todayStats.fat,
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

      // Show check-in reminder pop-up if no check-in today and tutorial isn't showing
      if (!checkinData) {
        const reminderDismissed = sessionStorage.getItem('fuel_checkin_reminder_dismissed')
        if (!reminderDismissed) {
          setShowCheckinReminder(true)
        }
      } else {
        setShowCheckinReminder(false)
      }

      // Live Fuel Score recalculation with nutrition data
      // If we have a check-in today, recalculate the score including nutrition compliance
      if (checkinData && mealsData) {
        const todayMealStats = mealsData.reduce((acc: any, meal: any) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
        }), { calories: 0, protein: 0 })

        const liveFuelScore = calculateFuelScore(
          {
            sleep: checkinData.sleep_quality || 5,
            stress: checkinData.stress || 5,
            energy: checkinData.energy || 5,
            soreness: checkinData.soreness || 5,
            hydration: checkinData.hydration_status || 5,
            hunger: checkinData.hunger || 5,
          },
          recsData ? {
            mealsLogged: mealsData.length,
            todayCalories: todayMealStats.calories,
            todayProtein: todayMealStats.protein,
            calorieGoal: recsData.daily_calories || 0,
            proteinGoal: recsData.daily_protein_g || 0,
          } : null
        )

        // Update the stored wellness_score if it changed (so coaches see the live score too)
        if (liveFuelScore !== checkinData.wellness_score) {
          await supabase
            .from('daily_checkins')
            .update({ wellness_score: liveFuelScore })
            .eq('athlete_id', athleteData.id)
            .eq('date', today)
          checkinData.wellness_score = liveFuelScore
        }
      }

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
    <main
      ref={mainRef}
      className="min-h-screen bg-slate-900 text-white pb-20 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <div className={`flex items-center gap-2 transition-opacity ${pullDistance >= PULL_THRESHOLD ? 'opacity-100' : 'opacity-50'}`}>
            <svg
              className={`w-5 h-5 text-purple-400 transition-transform ${pullDistance >= PULL_THRESHOLD ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)` }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs text-slate-400">
              {pullDistance >= PULL_THRESHOLD ? (refreshing ? 'Refreshing...' : 'Release to refresh') : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      {/* Header — merged greeting + name */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold text-white">
              {greeting()}{profile ? `, ${profile.full_name?.split(' ')[0] || ''}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {coachProfile && (
              <button
                onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors relative"
                title={`Chat with ${coachProfile.full_name?.split(' ')[0] || 'Coach'}`}
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </button>
            )}
            <button
              onClick={() => router.push('/athlete/profile')}
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors text-white font-bold text-sm"
            >
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Today's Progress — rings with goal labels underneath */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Today's Progress</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={caloriePercent}
                size={90}
                color="#9333EA"
                label="Calories"
                value={`${Math.round(stats.todayCalories)}`}
                unit="kcal"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 tabular-nums">
                {stats.calorieGoal > 0 ? `of ${stats.calorieGoal}` : 'no goal set'}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={proteinPercent}
                size={90}
                color="#9333EA"
                label="Protein"
                value={`${Math.round(stats.todayProtein)}`}
                unit="g"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 tabular-nums">
                {stats.proteinGoal > 0 ? `of ${stats.proteinGoal}g` : 'no goal set'}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={waterPercent}
                size={90}
                color="#9333EA"
                label="Water"
                value={`${Math.round(stats.todayWater)}`}
                unit="oz"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 tabular-nums">
                of {stats.waterGoal} oz
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => router.push(action.href)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center transition-all duration-200 active:scale-95 hover:border-purple-600/50 hover:bg-slate-700/50"
              >
                <div className="text-xl mb-1">{action.icon}</div>
                <h4 className="font-medium text-xs text-white leading-tight">{action.label}</h4>
              </button>
            ))}
          </div>
        </div>

        {/* This Week — compact single row */}
        <div className="mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-around">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.thisWeekMeals}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Meals</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.thisWeekCheckIns}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Check-ins</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{Math.round(stats.thisWeekHydration)}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">oz Water</p>
            </div>
          </div>
        </div>

        {/* Wellness + Check-in — unified card */}
        <div className="mb-6">
          {todayCheckin ? (
            <div>
              <WellnessSpotlight checkins={recentCheckins} role="athlete" />
              <div className="mt-2 flex items-center gap-2 px-1">
                <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                <span className="text-xs text-slate-500">Today's check-in complete</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Daily Check-in</h3>
                  <p className="text-xs text-slate-400">Check in to update your Fuel Score</p>
                </div>
                <Button
                  onClick={() => router.push('/athlete/checkin')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Check-in
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Personalized Targets — compact inline bar */}
        {recommendations && (
          <div className="mb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-400">Daily Targets</h3>
                <button
                  onClick={() => router.push('/athlete/profile')}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  View details
                </button>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Calories</span>
                    <span className="text-xs text-slate-300 tabular-nums">{Math.round(stats.todayCalories)} / {recommendations.daily_calories}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((stats.todayCalories / recommendations.daily_calories) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Protein</span>
                    <span className="text-xs text-slate-300 tabular-nums">{Math.round(stats.todayProtein)}g / {recommendations.daily_protein_g}g</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((stats.todayProtein / recommendations.daily_protein_g) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Carbs</span>
                    <span className="text-xs text-slate-300 tabular-nums">{Math.round(stats.todayCarbs)}g / {recommendations.daily_carbs_g}g</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((stats.todayCarbs / recommendations.daily_carbs_g) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Fat</span>
                    <span className="text-xs text-slate-300 tabular-nums">{Math.round(stats.todayFat)}g / {recommendations.daily_fat_g}g</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((stats.todayFat / recommendations.daily_fat_g) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Meals */}
        {recentMeals.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400">Recent Meals</h3>
              <button
                onClick={() => router.push('/athlete/meals/history')}
                className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
              >
                View All →
              </button>
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
      {/* Chat Modal */}
      {showChat && athlete && userId && coachProfile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">Chat with {coachProfile.full_name?.split(' ')[0] || 'Coach'}</h2>
            <button
              onClick={() => setShowChat(false)}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              athleteId={athlete.id}
              currentUserId={userId}
              otherUserId={coachProfile.id}
              otherUserName={coachProfile.full_name || 'Your Coach'}
              otherUserRole="Coach"
              senderName={profile?.full_name || 'Athlete'}
              senderRole={profile?.role || 'athlete'}
              otherUserEmail={coachProfile.email}
            />
          </div>
        </div>
      )}

      {/* Check-in Reminder Pop-up */}
      {showCheckinReminder && !showTutorial && !loading && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-purple-500/30 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-600/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">You haven't checked in yet!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your Fuel Score is waiting. It only takes 60 seconds to check in and let your coach know how you're feeling today.
              </p>
            </div>
            <div className="px-6 pb-6 pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowCheckinReminder(false)
                  sessionStorage.setItem('fuel_checkin_reminder_dismissed', 'true')
                  router.push('/athlete/checkin')
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors active:scale-[0.98]"
              >
                Check In Now
              </button>
              <button
                onClick={() => {
                  setShowCheckinReminder(false)
                  sessionStorage.setItem('fuel_checkin_reminder_dismissed', 'true')
                }}
                className="w-full py-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
              >
                I'll do it later
              </button>
            </div>
          </div>
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
