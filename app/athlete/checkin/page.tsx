'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { getLocalDateString } from '@/lib/utils/date'
import { calculateCheckinScore, getZoneInfo } from '@/lib/fuel-score'

interface SliderFieldProps {
  label: string
  field: string
  value: number
  onChange: (field: string, value: number) => void
  invertColors?: boolean // true = low is good (green), high is bad (red)
  lowLabel?: string
  highLabel?: string
}

function SliderField({ label, field, value, onChange, invertColors = false, lowLabel = 'Low', highLabel = 'High' }: SliderFieldProps) {
  let emoji: string
  let color: string

  if (invertColors) {
    // Inverted: low = green (good), high = red (bad) — for soreness, hunger, stress
    emoji = value <= 3 ? '🟢' : value <= 6 ? '🟡' : '🔴'
    color = value <= 3 ? 'text-green-400' : value <= 6 ? 'text-yellow-400' : 'text-red-400'
  } else {
    // Normal: low = red (bad), high = green (good) — for energy, hydration, sleep
    emoji = value <= 3 ? '🔴' : value <= 6 ? '🟡' : '🟢'
    color = value <= 3 ? 'text-red-400' : value <= 6 ? 'text-yellow-400' : 'text-green-400'
  }

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
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
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

  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)

  // Fetch user type and existing check-in on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('id, user_type')
          .eq('profile_id', user.id)
          .single()
        if (athlete?.user_type) setUserType(athlete.user_type as 'athlete' | 'member')

        // Check if there's already a check-in for today
        if (athlete) {
          const today = getLocalDateString()
          const { data: existing } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('athlete_id', athlete.id)
            .eq('date', today)
            .single()

          if (existing) {
            setAlreadyCheckedIn(true)
            // Pre-fill the form with existing data
            // Convert sleep_hours back to slider value (reverse of: 3 + (slider - 1) * 0.67)
            const sleepSlider = existing.sleep_quality || Math.round(((existing.sleep_hours || 5) - 3) / 0.67 + 1)
            setForm({
              bodyWeight: existing.body_weight_lbs ? String(existing.body_weight_lbs) : '',
              sleep: Math.min(10, Math.max(1, sleepSlider)),
              soreness: existing.soreness || 5,
              energy: existing.energy || 5,
              hunger: existing.hunger || 5,
              stress: existing.stress || 5,
              hydration: existing.hydration_status || 5,
              trainingTypes: existing.training_type ? existing.training_type.split(', ') : [],
              notes: existing.notes || '',
            })
          }
        }
      }
    })()
  }, [])

  const [form, setForm] = useState({
    bodyWeight: '',
    sleep: 5,
    soreness: 5,
    energy: 5,
    hunger: 5,
    stress: 5,
    hydration: 5,
    trainingTypes: [] as string[],
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
      setError('No athlete profile found. Please complete onboarding first, or contact support at kelly@crossfitironflag.com.')
      setLoading(false)
      return
    }

    const today = getLocalDateString()

    // Fuel Score v2 — check-in portion (nutrition component added live on dashboard)
    const wellnessScore = calculateCheckinScore({
      sleep: form.sleep,
      stress: form.stress,
      energy: form.energy,
      soreness: form.soreness,
      hydration: form.hydration,
      hunger: form.hunger,
    })

    // Convert sleep slider (1-10) to approximate hours for backward compatibility
    // 1-2 = ~4hrs, 3-4 = ~5hrs, 5-6 = ~6.5hrs, 7-8 = ~7.5hrs, 9-10 = ~9hrs
    const sleepHoursApprox = 3 + (form.sleep - 1) * 0.67

    const { error: upsertError } = await supabase.from('daily_checkins').upsert({
      athlete_id: athlete.id,
      date: today,
      body_weight_lbs: parseFloat(form.bodyWeight) || null,
      sleep_hours: Math.round(sleepHoursApprox * 10) / 10,
      sleep_quality: form.sleep,
      soreness: form.soreness,
      energy: form.energy,
      hunger: form.hunger,
      stress: form.stress,
      hydration_status: form.hydration,
      training_type: form.trainingTypes.length > 0 ? form.trainingTypes.join(', ') : null,
      notes: form.notes || null,
      wellness_score: wellnessScore,
    }, { onConflict: 'athlete_id,date' })

    if (upsertError) {
      console.error('[Check-in Error]', upsertError)
      // Provide more specific error messages based on the error code
      if (upsertError.code === '42501' || upsertError.message?.includes('policy')) {
        setError('Permission error: Your account may not be fully set up. Please contact your coach or support at kelly@crossfitironflag.com.')
      } else if (upsertError.code === '23503') {
        setError('Account setup incomplete. Please complete onboarding first or contact support.')
      } else if (upsertError.code === '23514') {
        setError('Invalid data detected. Please check your entries and try again.')
      } else {
        setError(`Failed to save check-in: ${upsertError.message || 'Unknown error'}. Please try again or contact support.`)
      }
      // Report the error
      try {
        fetch('/api/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'critical',
            message: `Check-in save failed: ${upsertError.message}`,
            url: '/athlete/checkin',
            userId: user?.id,
            stack: JSON.stringify(upsertError),
          }),
        }).catch(() => {})
      } catch {}
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    // Use hard navigation (not client-side) to ensure dashboard fully remounts and fetches fresh data
    setTimeout(() => { window.location.href = '/athlete/dashboard' }, 1500)
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-white">Check-in saved!</h2>
          <p className="text-slate-400 text-sm mt-2">Great job staying on top of your health! Keep your streak going.</p>
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
              {alreadyCheckedIn && <span className="ml-2 text-green-400">✓ Already checked in today</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        
        {/* How Do You Feel — Now the first section */}
        <Card className="mb-6">
          <CardHeader title="How Do You Feel?" />
          <CardContent>
            <div className="space-y-6">
              <SliderField
                label="How Rested Do You Feel?"
                field="sleep"
                value={form.sleep}
                onChange={update}
                lowLabel="Barely slept"
                highLabel="Fully recharged"
              />
              <SliderField
                label="Energy"
                field="energy"
                value={form.energy}
                onChange={update}
                lowLabel="Running on empty"
                highLabel="Ready to go"
              />
              <SliderField
                label="Soreness"
                field="soreness"
                value={form.soreness}
                onChange={update}
                invertColors
                lowLabel="No soreness"
                highLabel="Everything hurts"
              />
              <SliderField
                label="Hunger"
                field="hunger"
                value={form.hunger}
                onChange={update}
                invertColors
                lowLabel="Not hungry"
                highLabel="Starving"
              />
              <SliderField
                label="Stress"
                field="stress"
                value={form.stress}
                onChange={update}
                invertColors
                lowLabel="Stress-free"
                highLabel="Maxed out"
              />
              <SliderField
                label="Hydration"
                field="hydration"
                value={form.hydration}
                onChange={update}
                lowLabel="Dehydrated"
                highLabel="Well hydrated"
              />
            </div>
            {/* Live Fuel Score Preview */}
            {(() => {
              const previewScore = calculateCheckinScore({
                sleep: form.sleep,
                stress: form.stress,
                energy: form.energy,
                soreness: form.soreness,
                hydration: form.hydration,
                hunger: form.hunger,
              })
              const zone = getZoneInfo(previewScore)
              return (
                <div className={`mt-5 p-3 rounded-lg border ${zone.border} bg-slate-800/50`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{zone.emoji}</span>
                      <div>
                        <span className={`text-xl font-bold ${zone.color}`}>{previewScore}</span>
                        <span className={`text-sm font-semibold ml-2 ${zone.color}`}>{zone.label}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">Check-in score preview</span>
                  </div>
                </div>
              )
            })()}
            <p className="text-slate-500 text-xs mt-3 leading-relaxed">
              Your Fuel Score is calculated from these inputs and your consistency in tracking nutrition. It is shared with your coach to help them support you.
            </p>
          </CardContent>
        </Card>

        {/* Training Today */}
        <Card className="mb-6">
          <CardHeader title={userType === 'member' ? 'Activity Today' : 'Training Today'} />
          <CardContent>
            <p className="text-slate-400 text-xs mb-3">Select all that apply</p>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {(userType === 'member'
                ? ['gym workout', 'cardio', 'yoga/pilates', 'sports/recreation', 'outdoor activity', 'rest/recovery']
                : ['practice', 'game', 'lift', 'conditioning', 'recovery', 'rest']
              ).map(type => {
                const isSelected = form.trainingTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        trainingTypes: isSelected
                          ? prev.trainingTypes.filter(t => t !== type)
                          : [...prev.trainingTypes, type],
                      }))
                    }}
                    className={`py-3 px-2 rounded-lg text-xs font-semibold capitalize transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Body Stats — Moved to bottom, optional */}
        <Card className="mb-6">
          <CardHeader title="Body Stats" />
          <div className="px-4 -mt-2 mb-2">
            <p className="text-slate-500 text-xs">Optional</p>
          </div>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Input
                type="number"
                value={form.bodyWeight}
                onChange={e => update('bodyWeight', e.target.value)}
                placeholder="185"
                label="Weight (lbs)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Journal Entry */}
        <Card className="mb-6">
          <CardHeader title="📔 Fuel Journal" />
          <div className="px-4 -mt-2 mb-3 space-y-2">
            <p className="text-slate-300 text-sm font-medium">
              Quick thoughts for your journal
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Jot down how you're feeling, how training went, energy levels, or anything else you notice about your body. You'll look back on these to spot patterns and track your progress.
            </p>
          </div>
          <CardContent>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="E.g., 'Felt strong in the gym today, good energy. Slept well last night. Legs still sore from yesterday's session.'"
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all resize-none"
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
          className="bg-purple-600 hover:bg-purple-700"
        >
          {alreadyCheckedIn ? 'Update Check-in' : 'Save Check-in'}
        </Button>
      </div>
    </main>
  )
}
