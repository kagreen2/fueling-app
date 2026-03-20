'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  if (existing) {
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
    const { error: err } = await supabase
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
    if (err) { setError(err.message); setLoading(false); return }
  }

  router.push('/athlete/dashboard')
}

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
  const labelClass = "text-zinc-400 text-sm mb-1 block"
  const selectClass = inputClass + " appearance-none"

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`text-xs font-medium ${i <= step ? 'text-green-500' : 'text-zinc-600'}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-zinc-400 text-sm mt-2">{STEPS[step]}</p>
        </div>

        {/* Step 1 — Personal info */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Personal info</h2>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Sex</label>
              <select value={form.sex} onChange={e => update('sex', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>School</label>
              <input type="text" value={form.school} onChange={e => update('school', e.target.value)} placeholder="School name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Grade</label>
              <select value={form.grade} onChange={e => update('grade', e.target.value)} className={selectClass}>
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
            <h2 className="text-2xl font-bold text-white">Sport & team</h2>
            <div>
              <label className={labelClass}>Sport</label>
              <select value={form.sport} onChange={e => update('sport', e.target.value)} className={selectClass}>
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
              <label className={labelClass}>Position</label>
              <input type="text" value={form.position} onChange={e => update('position', e.target.value)} placeholder="e.g. Quarterback, Forward..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Team level</label>
              <select value={form.teamLevel} onChange={e => update('teamLevel', e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option value="youth">Youth</option>
                <option value="middle_school">Middle School</option>
                <option value="jv">JV</option>
                <option value="varsity">Varsity</option>
                <option value="college">College</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Season phase</label>
              <select value={form.seasonPhase} onChange={e => update('seasonPhase', e.target.value)} className={selectClass}>
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
            <h2 className="text-2xl font-bold text-white">Body stats</h2>
            <p className="text-zinc-400 text-sm">Used to calculate your personal fueling targets.</p>
            <div>
              <label className={labelClass}>Height</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input type="number" value={form.heightFt} onChange={e => update('heightFt', e.target.value)} placeholder="Ft" className={inputClass} />
                </div>
                <div className="flex-1">
                  <input type="number" value={form.heightIn} onChange={e => update('heightIn', e.target.value)} placeholder="In" className={inputClass} />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Current weight (lbs)</label>
              <input type="number" value={form.weightLbs} onChange={e => update('weightLbs', e.target.value)} placeholder="185" className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 4 — Goals */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Your goal</h2>
            <div>
              <label className={labelClass}>Primary goal</label>
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
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      form.goalPhase === g.value
                        ? 'border-green-500 bg-green-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <div className="font-medium">{g.label}</div>
                    <div className="text-sm text-zinc-500">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Allergies <span className="text-zinc-600">(comma separated)</span></label>
              <input type="text" value={form.allergies} onChange={e => update('allergies', e.target.value)} placeholder="e.g. peanuts, shellfish" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dietary restrictions <span className="text-zinc-600">(comma separated)</span></label>
              <input type="text" value={form.dietaryRestrictions} onChange={e => update('dietaryRestrictions', e.target.value)} placeholder="e.g. vegetarian, gluten-free" className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 5 — Training */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Training schedule</h2>
            <p className="text-zinc-400 text-sm">Help us understand your weekly training load.</p>
            <div>
              <label className={labelClass}>Describe your typical training week</label>
              <textarea
                value={form.trainingSchedule}
                onChange={e => update('trainingSchedule', e.target.value)}
                placeholder="e.g. Practice Mon/Wed/Fri, lift Tue/Thu, game Saturday..."
                rows={5}
                className={inputClass + ' resize-none'}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={back}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-4 rounded-xl transition-colors border border-zinc-700"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold py-4 rounded-xl transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold py-4 rounded-xl transition-colors"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </button>
          )}
        </div>

      </div>
    </main>
  )
}