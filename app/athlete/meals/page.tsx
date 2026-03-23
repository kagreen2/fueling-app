'use client'

import { useState } from 'react'
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

export default function MealsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    mealTitle: '',
    description: '',
    photo: null as File | null,
  })

  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [error, setError] = useState('')

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

    const today = new Date().toISOString().split('T')[0]
    
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
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-purple-600 hover:bg-slate-800/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm text-slate-400">Click to upload meal photo</p>
                    <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
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
                  color="orange"
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
