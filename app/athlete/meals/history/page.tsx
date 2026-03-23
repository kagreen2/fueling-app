'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface MealLog {
  id: string
  athlete_id: string
  meal_title: string
  description: string | null
  photo_url: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'high' | 'medium' | 'low' | null
  ai_feedback: string | null
  ai_next_step: string | null
  date: string
  logged_at: string
  created_at: string
}

interface DayGroup {
  date: string
  label: string
  meals: MealLog[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export default function MealHistoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [search, setSearch] = useState('')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMeals()
  }, [])

  async function loadMeals() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) {
      router.push('/athlete/onboarding')
      return
    }

    const { data: mealsData, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('date', { ascending: false })
      .order('logged_at', { ascending: false })

    if (mealsData) {
      setMeals(mealsData)
      // Auto-expand today's meals
      const { getLocalDateString } = await import('@/lib/utils/date')
      const today = getLocalDateString()
      setExpandedDays(new Set([today]))
    }

    setLoading(false)
  }

  // Group meals by date
  const dayGroups: DayGroup[] = useMemo(() => {
    const filtered = search
      ? meals.filter(m =>
          m.meal_title.toLowerCase().includes(search.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
        )
      : meals

    const groups: Record<string, MealLog[]> = {}
    for (const meal of filtered) {
      const date = meal.date || meal.created_at?.split('T')[0] || 'Unknown'
      if (!groups[date]) groups[date] = []
      groups[date].push(meal)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayMeals]) => {
        const totals = dayMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m.calories || 0),
            protein: acc.protein + (m.protein || 0),
            carbs: acc.carbs + (m.carbs || 0),
            fat: acc.fat + (m.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )

        return {
          date,
          label: formatDateLabel(date),
          meals: dayMeals,
          totals,
        }
      })
  }, [meals, search])

  function formatDateLabel(dateStr: string): string {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const yd = new Date(Date.now() - 86400000)
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`

    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'

    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  function toggleDay(date: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function toggleMeal(id: string) {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function formatTime(isoStr: string): string {
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return ''
    }
  }

  const totalMealsCount = meals.length
  const totalDays = dayGroups.length

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📋</div>
          <p className="text-slate-400">Loading meal history...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Meal History</h1>
            <p className="text-xs text-slate-400">
              {totalMealsCount} meal{totalMealsCount !== 1 ? 's' : ''} across {totalDays} day{totalDays !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/athlete/meals')}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Log Meal
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meals..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 placeholder-slate-500 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {dayGroups.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            {search ? (
              <>
                <h3 className="text-xl font-bold text-white mb-2">No meals found</h3>
                <p className="text-slate-400 mb-6">Try a different search term</p>
                <Button onClick={() => setSearch('')} variant="secondary">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-2">No meals logged yet</h3>
                <p className="text-slate-400 mb-6">Start tracking your nutrition to see your history here</p>
                <Button
                  onClick={() => router.push('/athlete/meals')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Log Your First Meal
                </Button>
              </>
            )}
          </div>
        )}

        {/* Day Groups */}
        <div className="space-y-4">
          {dayGroups.map(group => {
            const isExpanded = expandedDays.has(group.date)

            return (
              <div key={group.date}>
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(group.date)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-purple-600/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isExpanded ? '▾' : '▸'}</span>
                    <div className="text-left">
                      <h3 className="font-bold text-white">{group.label}</h3>
                      <p className="text-xs text-slate-400">
                        {group.meals.length} meal{group.meals.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-400">
                      {Math.round(group.totals.calories)} kcal
                    </p>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{Math.round(group.totals.protein)}g P</span>
                      <span>{Math.round(group.totals.carbs)}g C</span>
                      <span>{Math.round(group.totals.fat)}g F</span>
                    </div>
                  </div>
                </button>

                {/* Meals for this day */}
                {isExpanded && (
                  <div className="mt-2 space-y-3 pl-2">
                    {group.meals.map(meal => {
                      const isMealExpanded = expandedMeals.has(meal.id)
                      const totalMacros = (meal.protein || 0) + (meal.carbs || 0) + (meal.fat || 0)
                      const proteinPct = totalMacros > 0 ? ((meal.protein || 0) / totalMacros) * 100 : 0
                      const carbsPct = totalMacros > 0 ? ((meal.carbs || 0) / totalMacros) * 100 : 0
                      const fatPct = totalMacros > 0 ? ((meal.fat || 0) / totalMacros) * 100 : 0

                      return (
                        <Card key={meal.id} className="border-slate-700/50">
                          <CardContent>
                            {/* Meal Summary Row */}
                            <button
                              onClick={() => toggleMeal(meal.id)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white truncate">
                                      {meal.meal_title}
                                    </h4>
                                    {meal.confidence && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                        meal.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                                        meal.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-orange-500/20 text-orange-400'
                                      }`}>
                                        {meal.confidence === 'high' ? '✓' : meal.confidence === 'medium' ? '~' : '?'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {formatTime(meal.logged_at || meal.created_at)}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                  <p className="text-lg font-bold text-purple-400">{meal.calories || 0}</p>
                                  <p className="text-xs text-slate-500">kcal</p>
                                </div>
                              </div>

                              {/* Quick Macro Bar */}
                              <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700 mt-3">
                                <div className="bg-blue-500" style={{ width: `${proteinPct}%` }} />
                                <div className="bg-orange-500" style={{ width: `${carbsPct}%` }} />
                                <div className="bg-yellow-500" style={{ width: `${fatPct}%` }} />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>P: {meal.protein || 0}g</span>
                                <span>C: {meal.carbs || 0}g</span>
                                <span>F: {meal.fat || 0}g</span>
                              </div>
                            </button>

                            {/* Expanded Details */}
                            {isMealExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                                {/* Photo */}
                                {meal.photo_url && (
                                  <img
                                    src={meal.photo_url}
                                    alt={meal.meal_title}
                                    className="w-full h-48 object-cover rounded-lg"
                                  />
                                )}

                                {/* Description */}
                                {meal.description && (
                                  <div>
                                    <p className="text-xs text-slate-400 font-medium mb-1">Description</p>
                                    <p className="text-sm text-slate-300">{meal.description}</p>
                                  </div>
                                )}

                                {/* Detailed Macros */}
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-slate-400">Calories</p>
                                    <p className="font-bold text-white">{meal.calories || 0}</p>
                                    <p className="text-xs text-slate-500">kcal</p>
                                  </div>
                                  <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-blue-400">Protein</p>
                                    <p className="font-bold text-white">{meal.protein || 0}g</p>
                                    <p className="text-xs text-slate-500">{Math.round(proteinPct)}%</p>
                                  </div>
                                  <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-orange-400">Carbs</p>
                                    <p className="font-bold text-white">{meal.carbs || 0}g</p>
                                    <p className="text-xs text-slate-500">{Math.round(carbsPct)}%</p>
                                  </div>
                                  <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-yellow-400">Fat</p>
                                    <p className="font-bold text-white">{meal.fat || 0}g</p>
                                    <p className="text-xs text-slate-500">{Math.round(fatPct)}%</p>
                                  </div>
                                </div>

                                {/* AI Feedback */}
                                {meal.ai_feedback && (
                                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                    <p className="text-xs text-purple-300 font-medium mb-1">💡 Coach's Feedback</p>
                                    <p className="text-sm text-slate-300">{meal.ai_feedback}</p>
                                  </div>
                                )}

                                {/* Next Step */}
                                {meal.ai_next_step && (
                                  <div className="bg-slate-700/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 font-medium mb-1">Next Step</p>
                                    <p className="text-sm text-slate-200">{meal.ai_next_step}</p>
                                  </div>
                                )}

                                {/* Confidence */}
                                {meal.confidence && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">AI Confidence</span>
                                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                                      meal.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                                      meal.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {meal.confidence}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
