'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { getLocalDateString } from '@/lib/utils/date'

interface SliderFieldProps {
  label: string
  field: string
  value: number
  onChange: (field: string, value: number) => void
}

function SliderField({ label, field, value, onChange }: SliderFieldProps) {
  const emoji = value <= 3 ? '🔴' : value <= 6 ? '🟡' : '🟢'
  const color = value <= 3 ? 'text-red-400' : value <= 6 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <div className={`text-lg font-bold ${color}`}>
          {emoji} {value}/10
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={e => onChange(field, parseInt(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userType, setUserType] = useState<'athlete' | 'member'>('athlete')

  // Fetch user type on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('user_type')
          .eq('profile_id', user.id)
          .single()
        if (athlete?.user_type) setUserType(athlete.user_type as 'athlete' | 'member')
      }
    })()
  }, [])

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

    const today = getLocalDateString()

    const { error: upsertError } = await supabase.from('daily_checkins').upsert({
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

    if (upsertError) {
      setError('Failed to save check-in. Please try again.')
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
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-white">Check-in saved!</h2>
          <p className="text-slate-400 text-sm mt-2">Great job staying on top of your health!</p>
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
          <div>
            <h1 className="text-2xl font-bold">Daily Check-in</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        
        {/* Body Stats */}
        <Card className="mb-6">
          <CardHeader title="Body Stats" />
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={form.bodyWeight}
                onChange={e => update('bodyWeight', e.target.value)}
                placeholder="185"
                label="Weight (lbs)"
              />
              <Input
                type="number"
                value={form.sleepHours}
                onChange={e => update('sleepHours', e.target.value)}
                placeholder="8"
                label="Sleep (hours)"
              />
            </div>
          </CardContent>
        </Card>

        {/* How Do You Feel */}
        <Card className="mb-6">
          <CardHeader title="How Do You Feel?" />
          <CardContent>
            <div className="space-y-6">
              <SliderField
                label="Energy"
                field="energy"
                value={form.energy}
                onChange={update}
              />
              <SliderField
                label="Soreness"
                field="soreness"
                value={form.soreness}
                onChange={update}
              />
              <SliderField
                label="Hunger"
                field="hunger"
                value={form.hunger}
                onChange={update}
              />
              <SliderField
                label="Stress"
                field="stress"
                value={form.stress}
                onChange={update}
              />
              <SliderField
                label="Hydration"
                field="hydration"
                value={form.hydration}
                onChange={update}
              />
            </div>
          </CardContent>
        </Card>

        {/* Training Today */}
        <Card className="mb-6">
          <CardHeader title={userType === 'member' ? 'Activity Today' : 'Training Today'} />
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(userType === 'member'
                ? ['gym workout', 'cardio', 'yoga/pilates', 'sports/recreation', 'outdoor activity', 'rest/recovery']
                : ['practice', 'game', 'lift', 'conditioning', 'recovery', 'rest']
              ).map(type => (
                <button
                  key={type}
                  onClick={() => update('trainingType', form.trainingType === type ? '' : type)}
                  className={`py-3 px-2 rounded-lg text-xs font-semibold capitalize transition-all active:scale-95 ${
                    form.trainingType === type
                      ? 'bg-green-500 text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mb-6">
          <CardHeader title="Notes" />
          <CardContent>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Anything else worth noting today..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
            />
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={() => { setError(null); handleSubmit(); }}
          isLoading={loading}
          size="lg"
          className="bg-green-500 hover:bg-green-600"
        >
          Save Check-in
        </Button>
      </div>
    </main>
  )
}
