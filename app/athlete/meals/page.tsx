'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MealLogPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [mealTitle, setMealTitle] = useState('')
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setAnalysis(null)
  }

  async function analyzePhoto() {
    if (!photoFile && !description) {
      setError('Please add a photo or description')
      return
    }
    setAnalyzing(true)
    setError('')

    try {
      const formData = new FormData()
      if (photoFile) formData.append('photo', photoFile)
      formData.append('description', description)
      formData.append('mealTitle', mealTitle)

      const res = await fetch('/api/meals/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.error) { setError(data.error); setAnalyzing(false); return }
      setAnalysis(data)
    } catch (err) {
      setError('Analysis failed. Please try again.')
    }
    setAnalyzing(false)
  }

  async function saveMeal() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) { setLoading(false); return }

    let photoUrl = null
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `meals/${athlete.id}/${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage
        .from('meal-photos')
        .upload(path, photoFile)
      if (upload) {
        const { data: url } = supabase.storage
          .from('meal-photos')
          .getPublicUrl(path)
        photoUrl = url.publicUrl
      }
    }

    await supabase.from('meal_logs').insert({
      athlete_id: athlete.id,
      meal_title: mealTitle || analysis?.mealTitle || 'Meal',
      description,
      photo_url: photoUrl,
      est_calories: analysis?.calories,
      est_protein_g: analysis?.protein,
      est_carbs_g: analysis?.carbs,
      est_fat_g: analysis?.fat,
      confidence: analysis?.confidence,
      ai_feedback: analysis?.feedback,
      ai_next_step: analysis?.nextStep,
      clarifying_question: analysis?.clarifyingQuestion,
    })

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/athlete/dashboard'), 1500)
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-white text-xl font-bold">Meal logged!</h2>
          <p className="text-zinc-400 text-sm mt-2">Heading back to dashboard...</p>
        </div>
      </main>
    )
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'text-green-400'
    if (c === 'medium') return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold">Log a meal</h1>
            <p className="text-zinc-500 text-sm">Photo or description — AI does the rest</p>
          </div>
        </div>

        <div className="flex flex-col gap-5">

          {/* Photo upload */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Food photo
            </h2>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Meal preview"
                  className="w-full h-56 object-cover rounded-xl"
                />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setAnalysis(null) }}
                  className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1 rounded-full"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-green-500 transition-colors">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-zinc-400 text-sm">Tap to upload a photo</p>
                <p className="text-zinc-600 text-xs mt-1">JPG, PNG, HEIC supported</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Meal details */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Meal details
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Meal name (optional)</label>
                <input
                  type="text"
                  value={mealTitle}
                  onChange={e => setMealTitle(e.target.value)}
                  placeholder="e.g. Post-practice lunch"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">
                  Description <span className="text-zinc-600">(helps AI accuracy)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Grilled chicken breast, white rice, broccoli, olive oil..."
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Analyze button */}
          {!analysis && (
            <button
              onClick={analyzePhoto}
              disabled={analyzing || (!photoFile && !description)}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold py-4 rounded-xl text-lg transition-colors"
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span> Analyzing...
                </span>
              ) : 'Analyze with AI'}
            </button>
          )}

          {/* AI Analysis results */}
          {analysis && (
            <div className="bg-zinc-900 rounded-2xl p-5 border border-green-500/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
                  AI Analysis
                </h2>
                <span className={`text-xs font-medium ${confidenceColor(analysis.confidence)}`}>
                  {analysis.confidence} confidence
                </span>
              </div>

              {/* Macro grid */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Calories', value: analysis.calories, unit: 'kcal' },
                  { label: 'Protein', value: analysis.protein, unit: 'g' },
                  { label: 'Carbs', value: analysis.carbs, unit: 'g' },
                  { label: 'Fat', value: analysis.fat, unit: 'g' },
                ].map(m => (
                  <div key={m.label} className="bg-zinc-800 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-green-400">{m.value}</div>
                    <div className="text-zinc-500 text-xs">{m.label}</div>
                    <div className="text-zinc-600 text-xs">{m.unit}</div>
                  </div>
                ))}
              </div>

              {/* AI feedback */}
              {analysis.feedback && (
                <div className="bg-zinc-800 rounded-xl p-4 mb-3">
                  <p className="text-sm text-zinc-300 leading-relaxed">{analysis.feedback}</p>
                </div>
              )}

              {/* Next step */}
              {analysis.nextStep && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-3">
                  <p className="text-green-400 text-sm font-medium">💡 {analysis.nextStep}</p>
                </div>
              )}

              {/* Clarifying question */}
              {analysis.clarifyingQuestion && (
                <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm">❓ {analysis.clarifyingQuestion}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setAnalysis(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
                >
                  Re-analyze
                </button>
                <button
                  onClick={saveMeal}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Saving...' : 'Save meal'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}