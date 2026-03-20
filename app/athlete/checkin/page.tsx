'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CheckInPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    bodyWeight: '',
    sleepHours: '',
    soreness: 5,
    energy: 5,
    hunger: 5,
    stress: 5,
    hydration: 5,
    trainingType: '',
    notes: '',
  })

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
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

    await supabase.from('daily_checkins').upsert({
      athlete_id: athlete.id,
      date: today,
      body_weight_lbs: parseFloat(form.bodyWeight) || null,
      sleep_hours: parseFloat(form.sleepHours) || null,
      soreness: form.soreness,
      energy: form.energy,
      hunger: form.hunger,
      stress: form.stress,
      hydration_status: form.hydration,
      training_type: form.trainingType || null,
      notes: form.notes || null,
    }, { onConflict: 'athlete_id,date' })

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/athlete/dashboard'), 1500)
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
  const labelClass = "text-zinc-400 text-sm mb-1 block"

  function SliderField({ label, field, value }: { label: string, field: string, value: number }) {
    const emoji = value <= 3 ? '🔴' : value <= 6 ? '🟡' : '🟢'
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className={labelClass}>{label}</label>
          <span className="text-sm">{emoji} {value}/10</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={e => update(field, parseInt(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="flex justify-between text-zinc-600 text-xs mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-white text-xl font-bold">Check-in saved!</h2>
          <p className="text-zinc-400 text-sm mt-2">Heading back to dashboard...</p>
        </div>
      </main>
    )
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
            <h1 className="text-2xl font-bold">Daily check-in</h1>
            <p className="text-zinc-500 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Body stats */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Body stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Weight (lbs)</label>
                <input
                  type="number"
                  value={form.bodyWeight}
                  onChange={e => update('bodyWeight', e.target.value)}
                  placeholder="185"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sleep (hours)</label>
                <input
                  type="number"
                  value={form.sleepHours}
                  onChange={e => update('sleepHours', e.target.value)}
                  placeholder="8"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Readiness sliders */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-5">
              How do you feel?
            </h2>
            <div className="flex flex-col gap-5">
              <SliderField label="Energy" field="energy" value={form.energy} />
              <SliderField label="Soreness" field="soreness" value={form.soreness} />
              <SliderField label="Hunger" field="hunger" value={form.hunger} />
              <SliderField label="Stress" field="stress" value={form.stress} />
              <SliderField label="Hydration" field="hydration" value={form.hydration} />
            </div>
          </div>

          {/* Training */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Training today
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {['practice', 'game', 'lift', 'conditioning', 'recovery', 'rest'].map(type => (
                <button
                  key={type}
                  onClick={() => update('trainingType', form.trainingType === type ? '' : type)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-colors ${
                    form.trainingType === type
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              Notes
            </h2>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Anything else worth noting today..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Save check-in'}
          </button>

        </div>
      </div>
    </main>
  )
}