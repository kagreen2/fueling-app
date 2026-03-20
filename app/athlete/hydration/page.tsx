'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HydrationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existing, setExisting] = useState<any>(null)

  const [form, setForm] = useState({
    waterOz: 0,
    electrolyteOz: 0,
    prePracticeOz: 0,
    postPracticeOz: 0,
    urineColor: 0,
    notes: '',
  })

  useEffect(() => {
    async function loadToday() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!athlete) return

      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('athlete_id', athlete.id)
        .eq('date', today)
        .single()

      if (data) {
        setExisting(data)
        setForm({
          waterOz: data.water_oz || 0,
          electrolyteOz: data.electrolyte_oz || 0,
          prePracticeOz: data.pre_practice_oz || 0,
          postPracticeOz: data.post_practice_oz || 0,
          urineColor: data.urine_color_self_check || 0,
          notes: data.notes || '',
        })
      }
    }
    loadToday()
  }, [])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addWater(oz: number) {
    setForm(prev => ({ ...prev, waterOz: Math.max(0, prev.waterOz + oz) }))
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]

    await supabase.from('hydration_logs').upsert({
      athlete_id: athlete.id,
      date: today,
      water_oz: form.waterOz,
      electrolyte_oz: form.electrolyteOz,
      pre_practice_oz: form.prePracticeOz,
      post_practice_oz: form.postPracticeOz,
      urine_color_self_check: form.urineColor || null,
      notes: form.notes || null,
    }, { onConflict: 'athlete_id,date' })

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/athlete/dashboard'), 1500)
  }

  const urineColors = [
    { level: 1, color: '#FFF9C4', label: 'Clear' },
    { level: 2, color: '#FFF176', label: 'Pale yellow' },
    { level: 3, color: '#FFEE58', label: 'Light yellow' },
    { level: 4, color: '#FDD835', label: 'Yellow' },
    { level: 5, color: '#F9A825', label: 'Dark yellow' },
    { level: 6, color: '#E65100', label: 'Amber' },
    { level: 7, color: '#BF360C', label: 'Orange' },
    { level: 8, color: '#7B1FA2', label: 'Brown' },
  ]

  const hydrationStatus = () => {
    const oz = form.waterOz
    if (oz >= 100) return { label: 'Excellent', color: 'text-green-400', emoji: '💧' }
    if (oz >= 80) return { label: 'Good', color: 'text-green-400', emoji: '💧' }
    if (oz >= 60) return { label: 'Moderate', color: 'text-yellow-400', emoji: '⚠️' }
    if (oz >= 40) return { label: 'Low', color: 'text-orange-400', emoji: '⚠️' }
    return { label: 'Critical', color: 'text-red-400', emoji: '🚨' }
  }

  const status = hydrationStatus()

  if (saved) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">💧</div>
          <h2 className="text-white text-xl font-bold">Hydration logged!</h2>
          <p className="text-zinc-400 text-sm mt-2">Heading back to dashboard...</p>
        </div>
      </main>
    )
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"

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
            <h1 className="text-2xl font-bold">Hydration</h1>
            <p className="text-zinc-500 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">

          {/* Water tracker */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
                Water intake
              </h2>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.emoji} {status.label}
              </span>
            </div>

            {/* Big water display */}
            <div className="text-center py-4">
              <div className="text-6xl font-bold text-blue-400">{form.waterOz}</div>
              <div className="text-zinc-500 text-sm mt-1">oz today</div>
              <div className="text-zinc-600 text-xs mt-1">Goal: 100+ oz</div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-5">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((form.waterOz / 100) * 100, 100)}%` }}
              />
            </div>

            {/* Quick add buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[8, 16, 20, 32].map(oz => (
                <button
                  key={oz}
                  onClick={() => addWater(oz)}
                  className="bg-zinc-800 hover:bg-blue-500/20 hover:border-blue-500 border border-zinc-700 text-white py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  +{oz}oz
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="flex gap-3 items-center">
              <input
                type="number"
                value={form.waterOz || ''}
                onChange={e => update('waterOz', parseInt(e.target.value) || 0)}
                placeholder="Enter total oz"
                className={inputClass}
              />
              <button
                onClick={() => update('waterOz', 0)}
                className="text-zinc-600 hover:text-zinc-400 text-sm whitespace-nowrap transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Electrolytes */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Electrolytes
            </h2>
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">Electrolyte drinks (oz)</label>
              <div className="flex gap-2">
                {[8, 12, 16, 20].map(oz => (
                  <button
                    key={oz}
                    onClick={() => update('electrolyteOz', form.electrolyteOz + oz)}
                    className="flex-1 bg-zinc-800 hover:bg-green-500/20 hover:border-green-500 border border-zinc-700 text-white py-2 rounded-xl text-sm transition-colors"
                  >
                    +{oz}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-zinc-400 text-sm">Total:</span>
                <span className="text-white font-semibold">{form.electrolyteOz} oz</span>
                <button
                  onClick={() => update('electrolyteOz', 0)}
                  className="text-zinc-600 hover:text-zinc-400 text-xs ml-2 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Practice hydration */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Practice hydration
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Pre-practice (oz)</label>
                <input
                  type="number"
                  value={form.prePracticeOz || ''}
                  onChange={e => update('prePracticeOz', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Post-practice (oz)</label>
                <input
                  type="number"
                  value={form.postPracticeOz || ''}
                  onChange={e => update('postPracticeOz', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Urine color check */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-2">
              Urine color check
            </h2>
            <p className="text-zinc-500 text-xs mb-4">
              Tap the color that matches most closely
            </p>
            <div className="grid grid-cols-4 gap-2">
              {urineColors.map(c => (
                <button
                  key={c.level}
                  onClick={() => update('urineColor', c.level)}
                  className={`rounded-xl p-3 text-center border-2 transition-all ${
                    form.urineColor === c.level
                      ? 'border-white scale-105'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                >
                  <div className="text-xs font-medium text-zinc-900 mt-1">{c.label}</div>
                </button>
              ))}
            </div>
            {form.urineColor > 0 && (
              <div className={`mt-3 text-sm text-center ${
                form.urineColor <= 3 ? 'text-green-400' :
                form.urineColor <= 5 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {form.urineColor <= 2 ? '✅ Well hydrated' :
                 form.urineColor <= 3 ? '✅ Good hydration' :
                 form.urineColor <= 5 ? '⚠️ Drink more water' :
                 '🚨 Significantly dehydrated — drink water now'}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Notes
            </h2>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Hot practice today, sweated a lot..."
              rows={2}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Save hydration log'}
          </button>

        </div>
      </div>
    </main>
  )
}