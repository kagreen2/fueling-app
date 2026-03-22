'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const STEPS = [
  'Personal info',
  'Sport & team',
  'Body stats',
  'Goals',
  'Training',
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Step 1 — Personal
    dob: '',
    sex: '',
    school: '',
    grade: '',
    // Step 2 — Sport
    sport: '',
    position: '',
    teamLevel: '',
    seasonPhase: '',
    // Step 3 — Body
    heightFt: '',
    heightIn: '',
    weightLbs: '',
    // Step 4 — Goals
    goalPhase: '',
    allergies: '',
    dietaryRestrictions: '',
    // Step 5 — Training
    trainingSchedule: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function next() {
    setError('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setStep(s => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const heightInches =
      (parseInt(form.heightFt) || 0) * 12 + (parseInt(form.heightIn) || 0)

    const { data: existing } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    let athleteId: string

    if (existing) {
      athleteId = existing.id
      const { error: err } = await supabase
        .from('athletes')
        .update({
          dob: form.dob,
          sex: form.sex,
          grade: form.grade,
          height_inches: heightInches,
          weight_lbs: parseFloat(form.weightLbs) || null,
          goal_phase: form.goalPhase || 'maintain_performance',
          season_phase: form.seasonPhase || 'offseason',
          allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()) : [],
          dietary_restrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s: string) => s.trim()) : [],
          training_schedule: form.trainingSchedule,
          onboarding_complete: true,
        })
        .eq('profile_id', user.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data: newAthlete, error: err } = await supabase
        .from('athletes')
        .insert({
          profile_id: user.id,
          dob: form.dob,
          sex: form.sex,
          grade: form.grade,
          height_inches: heightInches,
          weight_lbs: parseFloat(form.weightLbs) || null,
          goal_phase: form.goalPhase || 'maintain_performance',
          season_phase: form.seasonPhase || 'offseason',
          allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()) : [],
          dietary_restrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s: string) => s.trim()) : [],
          training_schedule: form.trainingSchedule,
          onboarding_complete: true,
        })
        .select('id')
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      athleteId = newAthlete.id
    }

    // Generate personalized nutrition recommendations
    try {
      await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      })
    } catch (e) {
      console.error('Error generating recommendations:', e)
    }

    router.push('/athlete/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Let's Get Started</h1>
          <p className="text-slate-400">Complete your profile to unlock personalized fueling insights</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur">
          <div className="flex justify-between mb-3">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`text-xs font-medium transition-colors ${i <= step ? 'text-purple-400' : 'text-slate-600'}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-slate-300 text-sm mt-3 font-medium">{STEPS[step]}</p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur">
          {/* Step 1 — Personal info */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Personal info</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Date of birth</label>
                <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors" required />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Sex</label>
                <select value={form.sex} onChange={e => update('sex', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">School</label>
                <input type="text" value={form.school} onChange={e => update('school', e.target.value)} placeholder="School name" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Grade</label>
                <select value={form.grade} onChange={e => update('grade', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select...</option>
                  {['7th','8th','9th','10th','11th','12th','College Freshman','College Sophomore','College Junior','College Senior'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2 — Sport & team */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Sport & team</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Sport</label>
                <select value={form.sport} onChange={e => update('sport', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select sport...</option>
                  <option value="football">Football</option>
                  <option value="boys_lacrosse">Boys Lacrosse</option>
                  <option value="girls_lacrosse">Girls Lacrosse</option>
                  <option value="boys_soccer">Boys Soccer</option>
                  <option value="girls_soccer">Girls Soccer</option>
                  <option value="boys_basketball">Boys Basketball</option>
                  <option value="girls_basketball">Girls Basketball</option>
                  <option value="baseball">Baseball</option>
                  <option value="softball">Softball</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Position</label>
                <input type="text" value={form.position} onChange={e => update('position', e.target.value)} placeholder="e.g. Quarterback, Forward..." className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Team level</label>
                <select value={form.teamLevel} onChange={e => update('teamLevel', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select...</option>
                  <option value="youth">Youth</option>
                  <option value="middle_school">Middle School</option>
                  <option value="jv">JV</option>
                  <option value="varsity">Varsity</option>
                  <option value="college">College</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Season phase</label>
                <select value={form.seasonPhase} onChange={e => update('seasonPhase', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select...</option>
                  <option value="offseason">Offseason</option>
                  <option value="preseason">Preseason</option>
                  <option value="in_season">In season</option>
                  <option value="postseason">Postseason</option>
                  <option value="summer">Summer</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Body stats */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Body stats</h2>
              <p className="text-slate-400 text-sm">Used to calculate your personal fueling targets.</p>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Height</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input type="number" value={form.heightFt} onChange={e => update('heightFt', e.target.value)} placeholder="Ft" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
                  </div>
                  <div className="flex-1">
                    <input type="number" value={form.heightIn} onChange={e => update('heightIn', e.target.value)} placeholder="In" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Current weight (lbs)</label>
                <input type="number" value={form.weightLbs} onChange={e => update('weightLbs', e.target.value)} placeholder="185" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>
            </div>
          )}

          {/* Step 4 — Goals */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Your goal</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-3 block">Primary goal</label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'gain_lean_mass', label: 'Gain lean mass', desc: 'Build muscle while minimizing fat' },
                    { value: 'lose_body_fat', label: 'Lose body fat', desc: 'Reduce fat while keeping muscle' },
                    { value: 'maintain_performance', label: 'Maintain & perform', desc: 'Fuel training without changing weight' },
                    { value: 'in_season_maintenance', label: 'In-season maintenance', desc: 'Stay fueled and recovered during season' },
                    { value: 'recover_rebuild', label: 'Recover & rebuild', desc: 'Coming back from injury or offseason' },
                  ].map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => update('goalPhase', g.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        form.goalPhase === g.value
                          ? 'border-purple-600 bg-purple-600/10 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium">{g.label}</div>
                      <div className="text-sm text-slate-500">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Allergies <span className="text-slate-500">(comma separated)</span></label>
                <input type="text" value={form.allergies} onChange={e => update('allergies', e.target.value)} placeholder="e.g. peanuts, shellfish" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Dietary restrictions <span className="text-slate-500">(comma separated)</span></label>
                <input type="text" value={form.dietaryRestrictions} onChange={e => update('dietaryRestrictions', e.target.value)} placeholder="e.g. vegetarian, gluten-free" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>
            </div>
          )}

          {/* Step 5 — Training */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Training schedule</h2>
              <p className="text-slate-400 text-sm">How many days per week do you train?</p>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-3 block">Training frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {['3', '4', '5', '6', '7'].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => update('trainingSchedule', days)}
                      className={`py-3 rounded-lg border font-medium transition-colors ${
                        form.trainingSchedule === days
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {days}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mt-4">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={back}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={next}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Completing...' : 'Complete Profile'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
