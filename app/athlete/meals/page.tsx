'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'

interface MealAnalysis {
  mealTitle: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'high' | 'medium' | 'low'
  feedback: string
  nextStep: string
  clarifyingQuestion?: string
}

interface PastMeal {
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
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  count: number
  last_logged: string
}

export default function MealsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pastMeals, setPastMeals] = useState<PastMeal[]>([])
  const [quickLogging, setQuickLogging] = useState<string | null>(null)
  const [quickLogSuccess, setQuickLogSuccess] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(true)

  const [form, setForm] = useState({
    mealTitle: '',
    description: '',
    photo: null as File | null,
    mealType: '' as '' | 'breakfast' | 'lunch' | 'dinner' | 'snack',
  })

  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [error, setError] = useState('')

  // Load past meals for Recent & Frequent sections
  useEffect(() => {
    loadPastMeals()
  }, [])

  async function loadPastMeals() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) return
    setAthleteId(athlete.id)

    // Get last 30 days of meals
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: meals } = await supabase
      .from('meal_logs')
      .select('meal_title, description, photo_url, calories, protein, carbs, fat, confidence, ai_feedback, ai_next_step, meal_type, date, logged_at')
      .eq('athlete_id', athlete.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('logged_at', { ascending: false })

    if (meals) {
      // Deduplicate by meal_title and count frequency
      const mealMap = new Map<string, PastMeal>()
      for (const m of meals) {
        const key = m.meal_title.toLowerCase().trim()
        if (mealMap.has(key)) {
          const existing = mealMap.get(key)!
          existing.count++
        } else {
          mealMap.set(key, {
            meal_title: m.meal_title,
            description: m.description,
            photo_url: m.photo_url,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            confidence: m.confidence,
            ai_feedback: m.ai_feedback,
            ai_next_step: m.ai_next_step,
            meal_type: m.meal_type,
            count: 1,
            last_logged: m.logged_at || m.date,
          })
        }
      }
      setPastMeals(Array.from(mealMap.values()))
    }
  }

  // Recent = last 5 unique meals by date
  const recentMeals = useMemo(() => pastMeals.slice(0, 5), [pastMeals])

  // Frequent = top 5 most logged meals (at least 2 times)
  const frequentMeals = useMemo(() =>
    [...pastMeals]
      .filter(m => m.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    [pastMeals]
  )

  async function quickLog(meal: PastMeal) {
    if (!athleteId) return
    setQuickLogging(meal.meal_title)

    try {
      const { getLocalDateString } = await import('@/lib/utils/date')
      const today = getLocalDateString()

      const { error } = await supabase.from('meal_logs').insert({
        athlete_id: athleteId,
        meal_title: meal.meal_title,
        description: meal.description,
        photo_url: meal.photo_url,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        confidence: meal.confidence,
        ai_feedback: meal.ai_feedback,
        ai_next_step: meal.ai_next_step,
        meal_type: meal.meal_type,
        date: today,
        logged_at: new Date().toISOString(),
      })

      if (!error) {
        setQuickLogSuccess(meal.meal_title)
        setTimeout(() => {
          setQuickLogSuccess(null)
          setSaved(true)
          setTimeout(() => router.push('/athlete/dashboard'), 1500)
        }, 1000)
      }
    } catch (err) {
      console.error('Quick log error:', err)
    }
    setQuickLogging(null)
  }

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
    setAnalysis(null)
    setError('')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      update('photo', file)
      const reader = new FileReader()
      reader.onload = e => setPhotoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function analyzeMeal() {
    if (!form.mealTitle && !form.description && !form.photo) {
      setError('Please add a meal title, description, or photo')
      return
    }

    setAnalyzing(true)
    setError('')

    try {
      const formData = new FormData()
      if (form.photo) formData.append('photo', form.photo)
      if (form.description) formData.append('description', form.description)
      if (form.mealTitle) formData.append('mealTitle', form.mealTitle)

      const res = await fetch('/api/meals/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setAnalyzing(false)
        return
      }

      setAnalysis(data)
    } catch (err) {
      setError('Analysis failed. Please try again.')
    }

    setAnalyzing(false)
  }

  async function handleSubmit() {
    if (!form.mealTitle || !analysis) {
      setError('Please analyze the meal first')
      return
    }

    setLoading(true)
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
      setLoading(false)
      return
    }

    let photoUrl = null
    if (form.photo) {
      const fileName = `${athlete.id}/${Date.now()}-${form.photo.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, form.photo)

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('meal-photos')
          .getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
    }

    // Use local date to avoid timezone issues (e.g., 11pm CST = next day in UTC)
    const { getLocalDateString } = await import('@/lib/utils/date')
    const today = getLocalDateString()
    
    const { error: insertError } = await supabase.from('meal_logs').insert({
      athlete_id: athlete.id,
      meal_title: form.mealTitle,
      description: form.description || null,
      photo_url: photoUrl,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      confidence: analysis.confidence,
      ai_feedback: analysis.feedback,
      ai_next_step: analysis.nextStep,
      clarifying_question: analysis.clarifyingQuestion || null,
      meal_type: form.mealType || null,
      date: today,
      logged_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error saving meal:', insertError)
      setError('Failed to save meal. Please try again.')
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/athlete/dashboard'), 1500)
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍽️</div>
          <h2 className="text-2xl font-bold text-white">Meal logged!</h2>
          <p className="text-slate-400 text-sm mt-2">Great nutrition choice!</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
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
            <h1 className="text-2xl font-bold">Log a Meal</h1>
            <p className="text-xs text-slate-400">AI-powered nutrition analysis</p>
          </div>
          <button
            onClick={() => router.push('/athlete/meals/history')}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
          >
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">

        {/* Recent & Frequent Meals Quick-Add */}
        {(recentMeals.length > 0 || frequentMeals.length > 0) && showQuickAdd && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quick Add</h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Hide
              </button>
            </div>

            {/* Recent Meals */}
            {recentMeals.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Recent</p>
                <div className="space-y-2">
                  {recentMeals.map((meal, i) => (
                    <button
                      key={`recent-${i}`}
                      onClick={() => quickLog(meal)}
                      disabled={quickLogging === meal.meal_title || quickLogSuccess === meal.meal_title}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] ${
                        quickLogSuccess === meal.meal_title
                          ? 'bg-green-500/15 border-green-500/30'
                          : quickLogging === meal.meal_title
                          ? 'bg-slate-800 border-slate-700 opacity-60'
                          : 'bg-slate-800/80 border-slate-700 hover:border-purple-500/40 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {quickLogSuccess === meal.meal_title ? '\u2705 ' : ''}{meal.meal_title}
                          </span>
                          {meal.meal_type && (
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {meal.meal_type === 'breakfast' ? '\ud83c\udf05' : meal.meal_type === 'lunch' ? '\u2600\ufe0f' : meal.meal_type === 'dinner' ? '\ud83c\udf19' : '\ud83c\udf4e'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {meal.calories} kcal \u00b7 {meal.protein}g P \u00b7 {meal.carbs}g C \u00b7 {meal.fat}g F
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        {quickLogging === meal.meal_title ? (
                          <span className="text-xs text-slate-400">\u23f3</span>
                        ) : quickLogSuccess === meal.meal_title ? (
                          <span className="text-xs text-green-400">Logged!</span>
                        ) : (
                          <span className="text-xs text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-lg">+ Log</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Frequent Meals */}
            {frequentMeals.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Frequently Logged</p>
                <div className="space-y-2">
                  {frequentMeals.map((meal, i) => (
                    <button
                      key={`freq-${i}`}
                      onClick={() => quickLog(meal)}
                      disabled={quickLogging === meal.meal_title || quickLogSuccess === meal.meal_title}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] ${
                        quickLogSuccess === meal.meal_title
                          ? 'bg-green-500/15 border-green-500/30'
                          : quickLogging === meal.meal_title
                          ? 'bg-slate-800 border-slate-700 opacity-60'
                          : 'bg-slate-800/80 border-slate-700 hover:border-purple-500/40 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {quickLogSuccess === meal.meal_title ? '\u2705 ' : ''}{meal.meal_title}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                            {meal.count}x
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {meal.calories} kcal \u00b7 {meal.protein}g P \u00b7 {meal.carbs}g C \u00b7 {meal.fat}g F
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        {quickLogging === meal.meal_title ? (
                          <span className="text-xs text-slate-400">\u23f3</span>
                        ) : quickLogSuccess === meal.meal_title ? (
                          <span className="text-xs text-green-400">Logged!</span>
                        ) : (
                          <span className="text-xs text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-lg">+ Log</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mt-5 mb-2">
              <div className="flex-1 border-t border-slate-700" />
              <span className="text-xs text-slate-500 font-medium">or log a new meal</span>
              <div className="flex-1 border-t border-slate-700" />
            </div>
          </div>
        )}

        {/* Show Quick Add toggle if hidden */}
        {(recentMeals.length > 0 || frequentMeals.length > 0) && !showQuickAdd && (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full mb-4 text-xs text-purple-400 hover:text-purple-300 transition-colors py-2"
          >
            Show Quick Add (Recent & Frequent Meals)
          </button>
        )}

        {/* Photo Upload */}
        <Card className="mb-6">
          <CardHeader title="Meal Photo" />
          <CardContent>
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Meal preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setPhotoPreview(null)
                      update('photo', null)
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Take Photo Button - opens camera directly on mobile */}
                  <label className="flex items-center justify-center gap-3 w-full h-28 border-2 border-dashed border-purple-600/50 rounded-lg cursor-pointer bg-purple-600/5 hover:bg-purple-600/10 hover:border-purple-600 transition-all active:scale-[0.98]">
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-1">📷</div>
                      <p className="text-sm font-semibold text-purple-300">Take Photo</p>
                      <p className="text-xs text-slate-500">Open camera to snap your plate</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>

                  {/* Upload from Gallery */}
                  <label className="flex items-center justify-center gap-3 w-full h-20 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 hover:bg-slate-800/50 transition-all active:scale-[0.98]">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-1">🖼️</div>
                      <p className="text-sm text-slate-400">Upload from Gallery</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meal Type */}
        <Card className="mb-6">
          <CardHeader title="Meal Type" />
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
                { value: 'lunch', label: 'Lunch', icon: '☀️' },
                { value: 'dinner', label: 'Dinner', icon: '🌙' },
                { value: 'snack', label: 'Snack', icon: '🍎' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('mealType', form.mealType === option.value ? '' : option.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    form.mealType === option.value
                      ? 'border-green-500 bg-green-500/15 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs font-semibold">{option.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meal Details */}
        <Card className="mb-6">
          <CardHeader title="Meal Details" />
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Meal Name"
                value={form.mealTitle}
                onChange={e => update('mealTitle', e.target.value)}
                placeholder="e.g., Grilled Chicken & Rice"
              />
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  placeholder="Describe what you ate..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-500/10 border-red-500/20">
            <CardContent>
              <p className="text-sm text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="mb-6 space-y-4">
            {/* Macros */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Nutritional Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Calories"
                  value={analysis.calories}
                  unit="kcal"
                  icon="🔥"
                  color="red"
                  size="sm"
                />
                <StatCard
                  label="Protein"
                  value={analysis.protein}
                  unit="g"
                  icon="💪"
                  color="green"
                  size="sm"
                />
                <StatCard
                  label="Carbs"
                  value={analysis.carbs}
                  unit="g"
                  icon="🌾"
                  color="yellow"
                  size="sm"
                />
                <StatCard
                  label="Fat"
                  value={analysis.fat}
                  unit="g"
                  icon="🧈"
                  color="yellow"
                  size="sm"
                />
              </div>
            </div>

            {/* Confidence Badge */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">AI Confidence</span>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                    analysis.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                    analysis.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {analysis.confidence}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader title="Coach Feedback" />
              <CardContent>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {analysis.feedback}
                </p>
              </CardContent>
            </Card>

            {/* Next Step */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader title="Next Step" />
              <CardContent>
                <p className="text-sm text-green-300 leading-relaxed">
                  💡 {analysis.nextStep}
                </p>
              </CardContent>
            </Card>

            {/* Clarifying Question */}
            {analysis.clarifyingQuestion && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader title="Question" />
                <CardContent>
                  <p className="text-sm text-blue-300">
                    {analysis.clarifyingQuestion}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!analysis ? (
            <Button
              onClick={analyzeMeal}
              isLoading={analyzing}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSubmit}
                isLoading={loading}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Saving...' : 'Save Meal'}
              </Button>
              <Button
                onClick={() => {
                  setForm({ mealTitle: '', description: '', photo: null })
                  setPhotoPreview(null)
                  setAnalysis(null)
                }}
                variant="secondary"
                size="lg"
              >
                Log Another Meal
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
