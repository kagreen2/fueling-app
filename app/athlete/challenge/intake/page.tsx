'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const todayFallback = '2026-10-25'

export default function Fuel42IntakePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    primaryGoal: '', goalWeightLbs: '', goalBodyFatPercentage: '', targetDate: todayFallback,
    baselineHabit: '', nutritionChallenge: '', lifestyleSchedule: '', diningOutFrequency: '', mealPrepPreference: '', successStatement: '', coachContext: '',
    weightManagementSupport: 'prefer_not_to_say', weightManagementContext: '', leaderboardOptIn: true, leaderboardDisplayName: '', bodyCompConsent: false,
  })
  const [scanSummary, setScanSummary] = useState<{ weight_lbs?: number; percent_body_fat?: number; scan_date?: string } | null>(null)

  useEffect(() => {
    fetch('/api/challenges/fuel42/intake')
      .then(async response => { if (!response.ok) throw new Error((await response.json()).error || 'Unable to load challenge intake.'); return response.json() })
      .then(result => {
        const c = result.challenge || {}
        setScanSummary(result.latestScan)
        setForm(prev => ({ ...prev,
          primaryGoal: c.primary_goal || '', goalWeightLbs: c.goal_weight_lbs ?? '', goalBodyFatPercentage: c.goal_body_fat_percentage ?? '', targetDate: c.target_date || todayFallback,
          baselineHabit: c.baseline_habit || '', nutritionChallenge: c.nutrition_challenge || '', lifestyleSchedule: c.lifestyle_schedule || '', diningOutFrequency: c.dining_out_frequency || '', mealPrepPreference: c.meal_prep_preference || '', successStatement: c.challenge_success_statement || '', coachContext: c.coach_context || '',
          weightManagementSupport: c.weight_management_support || 'prefer_not_to_say', weightManagementContext: c.weight_management_context || '', leaderboardOptIn: c.leaderboard_opt_in !== false, leaderboardDisplayName: c.leaderboard_display_name || '', bodyCompConsent: c.body_comp_consent === true,
        }))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function update(key: keyof typeof form, value: string | boolean) { setForm(previous => ({ ...previous, [key]: value })) }
  async function save() {
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/challenges/fuel42/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to save challenge intake.')
      router.push('/athlete/challenge')
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }
  if (loading) return <main className="min-h-screen bg-slate-950 p-6 text-slate-300">Loading your FUEL 42 intake…</main>
  if (error && !saving) return <main className="min-h-screen bg-slate-950 p-6 text-white"><button onClick={() => router.push('/athlete/dashboard')} className="text-emerald-300">← Dashboard</button><p className="mt-8 text-red-300">{error}</p></main>
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400'
  const labelClass = 'block text-sm font-semibold text-slate-200'
  return (
    <main className="min-h-screen bg-slate-950 pb-12 text-white"><header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur"><div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-4"><button onClick={() => router.push('/athlete/dashboard')} className="text-xl text-slate-300">←</button><div><p className="text-[10px] font-bold tracking-[0.18em] text-emerald-400">FUEL 42 · YOUR 42-DAY PLAN</p><h1 className="text-xl font-bold">Challenge Intake</h1></div></div></header>
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        {scanSummary && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Starting point on file</p><p className="mt-1 text-sm text-slate-200">Latest scan: {scanSummary.weight_lbs ? `${scanSummary.weight_lbs} lb` : 'weight not recorded'}{scanSummary.percent_body_fat != null ? ` · ${scanSummary.percent_body_fat}% body fat` : ''}</p><p className="mt-2 text-xs text-slate-400">This information stays private and helps create your personalized targets.</p></section>}
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold">Your FUEL 42 goal</h2><label className={labelClass}>Primary focus<select value={form.primaryGoal} onChange={e => update('primaryGoal', e.target.value)} className={inputClass}><option value="">Choose your focus</option><option value="fat_loss">Reduce body fat</option><option value="build_muscle">Build or preserve muscle</option><option value="energy_habits">Improve energy and habits</option><option value="performance">Improve training performance</option></select></label><div className="grid grid-cols-2 gap-3"><label className={labelClass}>Goal weight <span className="font-normal text-slate-500">optional</span><input type="number" min="60" max="800" value={form.goalWeightLbs} onChange={e => update('goalWeightLbs', e.target.value)} className={inputClass} placeholder="lb" /></label><label className={labelClass}>Goal body fat <span className="font-normal text-slate-500">optional</span><input type="number" min="2" max="75" step="0.1" value={form.goalBodyFatPercentage} onChange={e => update('goalBodyFatPercentage', e.target.value)} className={inputClass} placeholder="%" /></label></div><label className={labelClass}>Target date<input type="date" min="2026-09-14" max="2026-10-31" value={form.targetDate} onChange={e => update('targetDate', e.target.value)} className={inputClass} /></label><label className={labelClass}>At the end of FUEL 42, success would feel like…<textarea value={form.successStatement} onChange={e => update('successStatement', e.target.value)} className={inputClass} rows={3} placeholder="A short statement in your own words" /></label></section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold">Make the plan fit real life</h2><label className={labelClass}>Your biggest nutrition challenge<textarea value={form.nutritionChallenge} onChange={e => update('nutritionChallenge', e.target.value)} className={inputClass} rows={2} placeholder="For example: afternoon snacking, meal planning, eating on the go" /></label><label className={labelClass}>Typical schedule or routine<textarea value={form.lifestyleSchedule} onChange={e => update('lifestyleSchedule', e.target.value)} className={inputClass} rows={2} placeholder="Work, family, travel, shift schedule, etc." /></label><div className="grid grid-cols-2 gap-3"><label className={labelClass}>Meals away from home<select value={form.diningOutFrequency} onChange={e => update('diningOutFrequency', e.target.value)} className={inputClass}><option value="">Select</option><option value="rarely">Rarely</option><option value="1_2_weekly">1–2 times/week</option><option value="3_5_weekly">3–5 times/week</option><option value="most_days">Most days</option></select></label><label className={labelClass}>Meal-prep preference<select value={form.mealPrepPreference} onChange={e => update('mealPrepPreference', e.target.value)} className={inputClass}><option value="">Select</option><option value="minimal">Minimal / quick options</option><option value="some">A few prepared meals</option><option value="full">I enjoy meal prep</option></select></label></div></section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold">Private coaching context</h2><label className={labelClass}>Are you currently using a GLP-1, another weight-management medication, peptide, or related treatment?<select value={form.weightManagementSupport} onChange={e => update('weightManagementSupport', e.target.value)} className={inputClass}><option value="prefer_not_to_say">Prefer not to say</option><option value="no">No</option><option value="yes">Yes</option></select></label>{form.weightManagementSupport === 'yes' && <label className={labelClass}>Anything you want your coach to know? <span className="font-normal text-slate-500">optional</span><textarea value={form.weightManagementContext} onChange={e => update('weightManagementContext', e.target.value)} className={inputClass} rows={3} placeholder="For example: appetite, energy, or training context" /></label>}<p className="text-xs leading-5 text-slate-400">Optional and private. This is coaching context only, visible only to you and your assigned coach. It is not medical advice or a request to change prescribed treatment.</p><label className={labelClass}>Anything else you want your coach to know?<textarea value={form.coachContext} onChange={e => update('coachContext', e.target.value)} className={inputClass} rows={3} /></label></section>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold">Leaderboard privacy</h2><label className="flex gap-3 text-sm text-slate-200"><input type="checkbox" checked={form.leaderboardOptIn} onChange={e => update('leaderboardOptIn', e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-400" /><span><strong className="text-white">Show me on the FUEL 42 leaderboard.</strong><br /><span className="text-xs text-slate-400">Others see only your display name, rank, and points—never your weight, body-fat percentage, scan values, or personal goals.</span></span></label><label className={labelClass}>Leaderboard display name<input value={form.leaderboardDisplayName} maxLength={40} onChange={e => update('leaderboardDisplayName', e.target.value)} className={inputClass} /></label><label className="flex gap-3 text-sm text-slate-200"><input type="checkbox" checked={form.bodyCompConsent} onChange={e => update('bodyCompConsent', e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-400" /><span>I understand that my private beginning and final scans may be used to calculate my own final body-composition points. My scan values will not be shown to other participants.</span></label></section>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<button onClick={save} disabled={saving} className="w-full rounded-xl bg-emerald-400 px-4 py-4 font-bold text-slate-950 transition-transform active:scale-[0.98] hover:bg-emerald-300 disabled:opacity-60">{saving ? 'Saving your challenge plan…' : 'Save FUEL 42 Plan'}</button>
      </div>
    </main>
  )
}
