'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Input } from '@/components/ui/Input'

const URINE_COLORS = [
  { level: 1, color: '#FFF9C4', label: 'Clear' },
  { level: 2, color: '#FFF176', label: 'Pale yellow' },
  { level: 3, color: '#FFEE58', label: 'Light yellow' },
  { level: 4, color: '#FDD835', label: 'Yellow' },
  { level: 5, color: '#F9A825', label: 'Dark yellow' },
  { level: 6, color: '#E65100', label: 'Amber' },
  { level: 7, color: '#BF360C', label: 'Orange' },
  { level: 8, color: '#7B1FA2', label: 'Brown' },
]

export default function HydrationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

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

  const hydrationStatus = () => {
    const oz = form.waterOz
    if (oz >= 100) return { label: 'Excellent', color: 'text-green-400', emoji: '💧' }
    if (oz >= 80) return { label: 'Good', color: 'text-green-400', emoji: '💧' }
    if (oz >= 60) return { label: 'Moderate', color: 'text-yellow-400', emoji: '⚠️' }
    if (oz >= 40) return { label: 'Low', color: 'text-orange-400', emoji: '⚠️' }
    return { label: 'Critical', color: 'text-red-400', emoji: '🚨' }
  }

  const status = hydrationStatus()

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

  if (saved) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💧</div>
          <h2 className="text-2xl font-bold text-white">Hydration logged!</h2>
          <p className="text-slate-400 text-sm mt-2">Great work staying hydrated!</p>
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
            <h1 className="text-2xl font-bold">Hydration</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        
        {/* Water Tracker */}
        <Card className="mb-6">
          <CardHeader
            title="Water Intake"
            action={
              <span className={`text-sm font-medium ${status.color}`}>
                {status.emoji} {status.label}
              </span>
            }
          />
          <CardContent>
            {/* Progress Ring */}
            <div className="flex justify-center mb-6">
              <ProgressRing
                percentage={Math.min((form.waterOz / 100) * 100, 100)}
                size={140}
                color="#3B82F6"
                value={form.waterOz}
                unit="oz"
                label="Today"
              />
            </div>

            {/* Goal indicator */}
            <p className="text-center text-xs text-slate-400 mb-6">
              Goal: 100+ oz | {form.waterOz >= 100 ? '✅ Goal reached!' : `${100 - form.waterOz} oz to go`}
            </p>

            {/* Quick add buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[8, 16, 20, 32].map(oz => (
                <button
                  key={oz}
                  onClick={() => addWater(oz)}
                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  +{oz}oz
                </button>
              ))}
            </div>

            {/* Manual input */}
            <Input
              type="number"
              value={form.waterOz || ''}
              onChange={e => update('waterOz', parseInt(e.target.value) || 0)}
              placeholder="Enter total oz"
              label="Manual Entry"
            />
          </CardContent>
        </Card>

        {/* Electrolytes */}
        <Card className="mb-6">
          <CardHeader title="Electrolytes" />
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[8, 12, 16, 20].map(oz => (
                <button
                  key={oz}
                  onClick={() => update('electrolyteOz', form.electrolyteOz + oz)}
                  className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  +{oz}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total:</span>
              <span className="text-lg font-bold text-white">{form.electrolyteOz} oz</span>
            </div>
          </CardContent>
        </Card>

        {/* Practice Hydration */}
        <Card className="mb-6">
          <CardHeader title="Practice Hydration" />
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={form.prePracticeOz || ''}
                onChange={e => update('prePracticeOz', parseInt(e.target.value) || 0)}
                placeholder="0"
                label="Pre-practice (oz)"
              />
              <Input
                type="number"
                value={form.postPracticeOz || ''}
                onChange={e => update('postPracticeOz', parseInt(e.target.value) || 0)}
                placeholder="0"
                label="Post-practice (oz)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Urine Color Check */}
        <Card className="mb-6">
          <CardHeader title="Urine Color Check" />
          <CardContent>
            <p className="text-xs text-slate-400 mb-4">
              Tap the color that matches most closely
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {URINE_COLORS.map(c => (
                <button
                  key={c.level}
                  onClick={() => update('urineColor', c.level)}
                  className={`rounded-lg p-3 text-center border-2 transition-all ${
                    form.urineColor === c.level
                      ? 'border-white scale-105 ring-2 ring-white/20'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  <div className="text-xs font-medium text-slate-900">{c.label}</div>
                </button>
              ))}
            </div>
            {form.urineColor > 0 && (
              <div className={`text-sm text-center p-3 rounded-lg ${
                form.urineColor <= 3 ? 'bg-green-500/10 text-green-400' :
                form.urineColor <= 5 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {form.urineColor <= 2 ? '✅ Well hydrated' :
                 form.urineColor <= 3 ? '✅ Good hydration' :
                 form.urineColor <= 5 ? '⚠️ Drink more water' :
                 '🚨 Significantly dehydrated — drink water now'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mb-6">
          <CardHeader title="Notes" />
          <CardContent>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Hot practice today, sweated a lot..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          isLoading={loading}
          size="lg"
          className="bg-blue-500 hover:bg-blue-600"
        >
          Save Hydration Log
        </Button>
      </div>
    </main>
  )
}
