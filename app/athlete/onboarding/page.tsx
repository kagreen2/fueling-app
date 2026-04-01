'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getLocalDateString } from '@/lib/utils/date'

// Steps change based on user type
const ATHLETE_STEPS = [
  'User type',
  'Personal info',
  'Sport & team',
  'Body stats',
  'Goals',
  'Training',
]

const MEMBER_STEPS = [
  'User type',
  'Personal info',
  'Body stats',
  'Goals',
  'Training',
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teamLookup, setTeamLookup] = useState<{ name: string; sport: string | null } | null>(null)
  const [teamLookupError, setTeamLookupError] = useState('')

  // InBody scan upload state
  const [inbodyScanFile, setInbodyScanFile] = useState<File | null>(null)
  const [inbodyScanPreview, setInbodyScanPreview] = useState<string | null>(null)
  const [inbodyScanning, setInbodyScanning] = useState(false)
  const [inbodyScanError, setInbodyScanError] = useState<string | null>(null)
  const [inbodyData, setInbodyData] = useState<any>(null)

  // Pre-fill invite code from URL params (passed from signup page)
  useEffect(() => {
    const invite = searchParams.get('invite')
    if (invite) {
      setForm(prev => ({ ...prev, inviteCode: invite.toUpperCase(), userType: 'athlete' }))
      // Auto-lookup the team
      const lookupTeam = async () => {
        const { data: team } = await supabase
          .from('teams')
          .select('name, sport')
          .eq('invite_code', invite.toUpperCase())
          .single()
        if (team) setTeamLookup(team)
      }
      lookupTeam()
    }

    // Pick up invite code from localStorage (set during signup)
    const storedInvite = localStorage.getItem('fuel_invite_code')
    if (storedInvite && !invite) {
      setForm(prev => ({ ...prev, inviteCode: storedInvite.toUpperCase() }))
      // Auto-lookup the team
      const lookupStoredTeam = async () => {
        const { data: team } = await supabase
          .from('teams')
          .select('name, sport')
          .eq('invite_code', storedInvite.toUpperCase())
          .single()
        if (team) setTeamLookup(team)
      }
      lookupStoredTeam()
      localStorage.removeItem('fuel_invite_code')
    }

    // Pick up user type from signup page selection
    const storedUserType = localStorage.getItem('fuel_user_type')
    if (storedUserType === 'athlete' || storedUserType === 'member') {
      setForm(prev => ({ ...prev, userType: storedUserType }))
      setStep(1) // Skip the user type step since they already chose
      localStorage.removeItem('fuel_user_type')
    }
  }, [searchParams, supabase])

  const [form, setForm] = useState({
    // Step 0 — User type
    userType: '' as '' | 'athlete' | 'member',
    // Step 1 — Personal
    dob: '',
    sex: '',
    school: '',
    grade: '',
    // Step 2 (athlete) — Sport
    sport: '',
    position: '',
    teamLevel: '',
    seasonPhase: '',
    inviteCode: '',
    // Step 2/3 — Body
    heightFt: '',
    heightIn: '',
    weightLbs: '',
    // Step 3/4 — Goals
    goalPhase: '',
    allergies: '',
    dietaryRestrictions: '',
    // Step 4/5 — Training
    trainingSchedule: '',
    // Member-specific fields
    activityLevel: '',
    trainingStyle: [] as string[],
  })

  const STEPS = form.userType === 'member' ? MEMBER_STEPS : ATHLETE_STEPS

  function toggleTrainingStyle(value: string) {
    setForm(prev => {
      const current = prev.trainingStyle as unknown as string[]
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, trainingStyle: updated }
    })
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear team lookup when invite code changes
    if (field === 'inviteCode') {
      setTeamLookup(null)
      setTeamLookupError('')
    }
  }

  async function lookupTeam() {
    if (!form.inviteCode.trim()) return
    setTeamLookupError('')
    setTeamLookup(null)

    const { data, error: err } = await supabase
      .from('teams')
      .select('name, sport')
      .eq('invite_code', form.inviteCode.trim().toUpperCase())
      .single()

    if (err || !data) {
      setTeamLookupError('No team found with that code. Check with your coach and try again.')
    } else {
      setTeamLookup({ name: data.name, sport: data.sport })
    }
  }

  function next() {
    setError('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setStep(s => Math.max(s - 1, 0))
  }

  // Get the current step name to determine which content to show
  const currentStepName = STEPS[step]

  async function handleInBodyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setInbodyScanFile(file)
    setInbodyScanPreview(URL.createObjectURL(file))
    setInbodyScanError(null)
    setInbodyScanning(true)

    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/biometrics/scan-photo', { method: 'POST', body: fd })
      const result = await res.json()

      if (!res.ok) {
        setInbodyScanError(result.error || 'Failed to read scan. You can still enter your stats manually below.')
        setInbodyScanning(false)
        return
      }

      const d = result.data
      setInbodyData(d)

      // Auto-fill weight from InBody if available
      if (d.weight_lbs) {
        update('weightLbs', Math.round(d.weight_lbs).toString())
      }

      setInbodyScanning(false)
    } catch {
      setInbodyScanError('Failed to process photo. You can still enter your stats manually below.')
      setInbodyScanning(false)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    // Validate DOB is reasonable (between 1920 and current year)
    if (form.dob) {
      const dobYear = parseInt(form.dob.split('-')[0])
      if (isNaN(dobYear) || dobYear < 1920 || dobYear > new Date().getFullYear()) {
        setError('Please enter a valid date of birth.')
        setLoading(false)
        return
      }
    }

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

    const athleteData = {
      dob: form.dob,
      sex: form.sex,
      school: form.school || null,
      grade: form.userType === 'athlete' ? form.grade : null,
      sport: form.userType === 'athlete' ? (form.sport || null) : null,
      position: form.userType === 'athlete' ? (form.position || null) : null,
      team_level: form.userType === 'athlete' ? (form.teamLevel || null) : null,
      height_inches: heightInches,
      weight_lbs: parseFloat(form.weightLbs) || null,
      goal_phase: form.goalPhase || 'maintain_performance',
      season_phase: form.userType === 'athlete' ? (form.seasonPhase || 'offseason') : 'offseason',
      allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()) : [],
      dietary_restrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s: string) => s.trim()) : [],
      training_schedule: form.trainingSchedule,
      onboarding_complete: true,
      user_type: form.userType || 'athlete',
      activity_level: form.userType === 'member' ? (form.activityLevel || null) : null,
      training_style: form.userType === 'member' ? ((form.trainingStyle as unknown as string[]).length > 0 ? (form.trainingStyle as unknown as string[]).join(',') : null) : null,
    }

    if (existing) {
      athleteId = existing.id
      const { error: err } = await supabase
        .from('athletes')
        .update(athleteData)
        .eq('profile_id', user.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data: newAthlete, error: err } = await supabase
        .from('athletes')
        .insert({
          profile_id: user.id,
          ...athleteData,
        })
        .select('id')
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      athleteId = newAthlete.id
    }

    // Join team if invite code was provided (athletes only)
    if (form.inviteCode.trim()) {
      try {
        const { data: team } = await supabase
          .from('teams')
          .select('id, coach_id')
          .eq('invite_code', form.inviteCode.trim().toUpperCase())
          .single()

        if (team) {
          await supabase
            .from('team_members')
            .upsert({
              team_id: team.id,
              athlete_id: athleteId,
            }, { onConflict: 'team_id,athlete_id' })

          // Auto-assign the team's coach to this athlete
          if (team.coach_id) {
            await supabase
              .from('athlete_coach_assignments')
              .upsert({
                athlete_id: athleteId,
                coach_id: team.coach_id,
              }, { onConflict: 'athlete_id' })
          }
        }
      } catch (e) {
        console.error('Error joining team:', e)
      }
    }

    // If InBody data was uploaded, save it as a biometric scan record
    if (inbodyData) {
      try {
        let photoUrl: string | null = null
        if (inbodyScanFile) {
          const fileName = `${athleteId}/${Date.now()}-${inbodyScanFile.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage.from('biometric-scans').upload(fileName, inbodyScanFile)
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('biometric-scans').getPublicUrl(uploadData.path)
            photoUrl = urlData.publicUrl
          }
        }

        const pn = (v: any) => v != null ? parseFloat(v) || null : null
        await supabase.from('biometric_scans').insert({
          athlete_id: athleteId,
          scan_date: getLocalDateString(),
          weight_lbs: pn(inbodyData.weight_lbs),
          intracellular_water_lbs: pn(inbodyData.intracellular_water_lbs),
          extracellular_water_lbs: pn(inbodyData.extracellular_water_lbs),
          dry_lean_mass_lbs: pn(inbodyData.dry_lean_mass_lbs),
          body_fat_mass_lbs: pn(inbodyData.body_fat_mass_lbs),
          total_body_water_lbs: pn(inbodyData.total_body_water_lbs),
          fat_free_mass_lbs: pn(inbodyData.fat_free_mass_lbs),
          skeletal_muscle_mass_lbs: pn(inbodyData.skeletal_muscle_mass_lbs),
          bmi: pn(inbodyData.bmi),
          percent_body_fat: pn(inbodyData.percent_body_fat),
          seg_lean_right_arm_lbs: pn(inbodyData.seg_lean_right_arm_lbs),
          seg_lean_left_arm_lbs: pn(inbodyData.seg_lean_left_arm_lbs),
          seg_lean_trunk_lbs: pn(inbodyData.seg_lean_trunk_lbs),
          seg_lean_right_leg_lbs: pn(inbodyData.seg_lean_right_leg_lbs),
          seg_lean_left_leg_lbs: pn(inbodyData.seg_lean_left_leg_lbs),
          ecw_tbw_ratio: pn(inbodyData.ecw_tbw_ratio),
          visceral_fat_area_cm2: pn(inbodyData.visceral_fat_area_cm2),
          source: 'athlete',
          entered_by: user.id,
          notes: 'Uploaded during onboarding',
          photo_url: photoUrl,
        })

        // Also update athlete record with body fat from InBody
        const updates: any = {}
        if (inbodyData.percent_body_fat) updates.body_fat_percentage = parseFloat(inbodyData.percent_body_fat)
        if (Object.keys(updates).length > 0) {
          await supabase.from('athletes').update(updates).eq('id', athleteId)
        }
      } catch (e) {
        console.error('Error saving InBody scan:', e)
      }
    }

    // Generate personalized nutrition recommendations
    // (This will automatically use InBody data if a biometric scan exists)
    try {
      await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      })
    } catch (e) {
      console.error('Error generating recommendations:', e)
    }

    // Mark any pending invitations as accepted
    try {
      await fetch('/api/coach/invitation-accepted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }), // API will use auth user's email
      })
    } catch (e) {
      // Non-critical — don't block onboarding
      console.error('Error marking invitation accepted:', e)
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
        {/* Welcome-back nudge for returning users */}
        {step === 0 && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-500">
            <span className="text-xl flex-shrink-0">👋</span>
            <div>
              <p className="text-green-400/70 text-sm mt-0.5">
                You're almost there — just a few quick steps to unlock your personalized nutrition plan.
              </p>
            </div>
          </div>
        )}

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
          
          {/* Step: User Type Selection */}
          {currentStepName === 'User type' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Fuel Different</h2>
              <p className="text-slate-400 text-sm">How would you like to use the app?</p>
              
              <button
                type="button"
                onClick={() => { update('userType', 'athlete'); next() }}
                className={`w-full text-left px-5 py-5 rounded-xl border transition-all ${
                  form.userType === 'athlete'
                    ? 'border-purple-600 bg-purple-600/10 text-white'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-2xl">
                    🏆
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Athlete</div>
                    <div className="text-sm text-slate-400">I play a sport and want sport-specific nutrition guidance</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { update('userType', 'member'); next() }}
                className={`w-full text-left px-5 py-5 rounded-xl border transition-all ${
                  form.userType === 'member'
                    ? 'border-purple-600 bg-purple-600/10 text-white'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-2xl">
                    💪
                  </div>
                  <div>
                    <div className="font-semibold text-lg">General Fitness</div>
                    <div className="text-sm text-slate-400">I train at the gym and want personalized nutrition coaching</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step: Personal info */}
          {currentStepName === 'Personal info' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Personal info</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Date of birth</label>
                <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} min="1920-01-01" max="2020-12-31" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors" required />
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

              {form.userType === 'athlete' && (
                <>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">School</label>
                    <input type="text" value={form.school} onChange={e => update('school', e.target.value)} placeholder="School name" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">Grade</label>
                    <select value={form.grade} onChange={e => update('grade', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                      <option value="">Select...</option>
                      {['7th','8th','Freshman','Sophomore','Junior','Senior','College Freshman','College Sophomore','College Junior','College Senior'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Sport & team (athletes only) */}
          {currentStepName === 'Sport & team' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Sport & team</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Sport</label>
                <select value={form.sport} onChange={e => update('sport', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors appearance-none">
                  <option value="">Select sport...</option>
                  <option value="baseball">Baseball</option>
                  <option value="basketball">Basketball</option>
                  <option value="cheerleading_dance">Cheerleading / Dance</option>
                  <option value="cross_country">Cross Country</option>
                  <option value="football">Football</option>
                  <option value="hockey">Hockey</option>
                  <option value="lacrosse">Lacrosse</option>
                  <option value="soccer">Soccer</option>
                  <option value="softball">Softball</option>
                  <option value="swimming">Swimming</option>
                  <option value="tennis">Tennis</option>
                  <option value="track_and_field">Track & Field</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="wrestling">Wrestling</option>
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

              {/* Team Invite Code */}
              <div className="mt-2 pt-4 border-t border-slate-700">
                <label className="text-slate-300 text-sm font-medium mb-1 block">Team invite code <span className="text-slate-500">(optional)</span></label>
                <p className="text-slate-500 text-xs mb-2">If your coach gave you a team code, enter it here to join their team.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.inviteCode}
                    onChange={e => update('inviteCode', e.target.value.toUpperCase())}
                    placeholder="e.g. TEAM-ABC123"
                    maxLength={20}
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500 uppercase tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    onClick={lookupTeam}
                    disabled={!form.inviteCode.trim()}
                    className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Verify
                  </button>
                </div>
                {teamLookup && (
                  <div className="mt-2 flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Joining <strong>{teamLookup.name}</strong>{teamLookup.sport ? ` — ${teamLookup.sport.replace(/_/g, ' ')}` : ''}</span>
                  </div>
                )}
                {teamLookupError && (
                  <div className="mt-2 text-red-400 text-sm px-1">
                    {teamLookupError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Body stats */}
          {currentStepName === 'Body stats' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Body stats</h2>
              <p className="text-slate-400 text-sm">Used to calculate your personal fueling targets.</p>

              {/* InBody scan upload — optional */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-lg flex-shrink-0">📊</div>
                  <div>
                    <p className="text-white font-medium text-sm">Have an InBody scan?</p>
                    <p className="text-slate-400 text-xs mt-0.5">Upload a photo of your InBody printout for the most accurate macro targets. This is optional — you can skip and enter your stats manually.</p>
                    <p className="text-slate-500 text-[10px] mt-1.5 leading-snug">By uploading your InBody scan, you consent to Fuel Different collecting, processing, and securely storing your body composition data to provide personalized nutrition recommendations. This data is shared only with your assigned coach and is never sold to third parties. You may request deletion at any time. <a href="/privacy" target="_blank" className="text-purple-400 underline">Privacy Policy</a></p>
                  </div>
                </div>

                {!inbodyScanPreview && !inbodyData && (
                  <label className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-purple-500/50 rounded-lg cursor-pointer transition-all">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-sm text-slate-300 font-medium">Upload InBody Photo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleInBodyUpload} className="hidden" />
                  </label>
                )}

                {inbodyScanning && (
                  <div className="flex items-center justify-center gap-2 py-3 text-purple-400">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Reading your InBody scan...</span>
                  </div>
                )}

                {inbodyScanError && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
                    {inbodyScanError}
                  </div>
                )}

                {inbodyData && !inbodyScanning && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2 rounded-lg mb-3">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span>InBody data extracted successfully!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {inbodyData.weight_lbs && (
                        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                          <div className="text-slate-500 text-xs">Weight</div>
                          <div className="text-white font-medium">{Math.round(inbodyData.weight_lbs)} lbs</div>
                        </div>
                      )}
                      {inbodyData.percent_body_fat && (
                        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                          <div className="text-slate-500 text-xs">Body Fat</div>
                          <div className="text-white font-medium">{inbodyData.percent_body_fat}%</div>
                        </div>
                      )}
                      {inbodyData.skeletal_muscle_mass_lbs && (
                        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                          <div className="text-slate-500 text-xs">Skeletal Muscle</div>
                          <div className="text-white font-medium">{Math.round(inbodyData.skeletal_muscle_mass_lbs * 10) / 10} lbs</div>
                        </div>
                      )}
                      {inbodyData.fat_free_mass_lbs && (
                        <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                          <div className="text-slate-500 text-xs">Fat-Free Mass</div>
                          <div className="text-white font-medium">{Math.round(inbodyData.fat_free_mass_lbs * 10) / 10} lbs</div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setInbodyData(null); setInbodyScanFile(null); setInbodyScanPreview(null); setInbodyScanError(null) }}
                      className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      Remove scan &amp; enter manually
                    </button>
                  </div>
                )}
              </div>

              {/* Manual entry fields — always shown */}
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
                <label className="text-slate-300 text-sm font-medium mb-2 block">Current weight (lbs){inbodyData?.weight_lbs ? ' — auto-filled from InBody' : ''}</label>
                <input type="number" value={form.weightLbs} onChange={e => update('weightLbs', e.target.value)} placeholder="185" className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500" />
              </div>
            </div>
          )}

          {/* Step: Goals */}
          {currentStepName === 'Goals' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Your goal</h2>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-3 block">Primary goal</label>
                <div className="flex flex-col gap-2">
                  {form.userType === 'athlete' ? (
                    // Athlete goals
                    [
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
                    ))
                  ) : (
                    // General fitness goals
                    [
                      { value: 'lose_body_fat', label: 'Lose body fat', desc: 'Reduce fat while preserving muscle' },
                      { value: 'gain_lean_mass', label: 'Build muscle', desc: 'Gain lean mass and strength' },
                      { value: 'maintain_performance', label: 'Maintain weight', desc: 'Stay at current weight while improving fitness' },
                      { value: 'recover_rebuild', label: 'Improve overall health', desc: 'Better energy, recovery, and general wellness' },
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
                    ))
                  )}
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

          {/* Step: Training */}
          {currentStepName === 'Training' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white mb-2">Training</h2>

              {form.userType === 'member' && (
                <>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-3 block">Activity level</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no exercise' },
                        { value: 'lightly_active', label: 'Lightly active', desc: 'Light exercise 1-3 days/week' },
                        { value: 'moderately_active', label: 'Moderately active', desc: 'Moderate exercise 3-5 days/week' },
                        { value: 'very_active', label: 'Very active', desc: 'Hard exercise 6-7 days/week' },
                        { value: 'extremely_active', label: 'Extremely active', desc: 'Very hard exercise, physical job, or 2x/day training' },
                      ].map(a => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => update('activityLevel', a.value)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            form.activityLevel === a.value
                              ? 'border-purple-600 bg-purple-600/10 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="font-medium">{a.label}</div>
                          <div className="text-sm text-slate-500">{a.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-3 block">Training style <span className="text-slate-500 font-normal">(select all that apply)</span></label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'strength', label: 'Strength Training', desc: 'Weightlifting, powerlifting, bodybuilding' },
                        { value: 'crossfit', label: 'High Intensity Interval Training (HIIT)', desc: 'CrossFit, bootcamps, functional fitness' },
                        { value: 'cardio', label: 'Cardio / Endurance', desc: 'Running, cycling, swimming' },
                        { value: 'mixed', label: 'Mixed / General Fitness', desc: 'Combination of strength and cardio' },
                        { value: 'yoga_pilates', label: 'Yoga / Pilates', desc: 'Flexibility, mobility, and bodyweight' },
                        { value: 'dance', label: 'Dance', desc: 'Hip hop, pole, dance classes, Zumba' },
                      ].map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleTrainingStyle(t.value)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            (form.trainingStyle as unknown as string[]).includes(t.value)
                              ? 'border-purple-600 bg-purple-600/10 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="font-medium">{t.label}</div>
                          <div className="text-sm text-slate-500">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-300 text-sm font-medium mb-3 block">Training frequency</label>
                <p className="text-slate-400 text-sm mb-3">How many days per week do you train?</p>
                <div className="grid grid-cols-4 gap-2">
                  {(form.userType === 'member' ? ['1', '2', '3', '4', '5', '6', '7'] : ['3', '4', '5', '6', '7']).map(days => (
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
            {step > 0 && currentStepName !== 'User type' && (
              <Button
                variant="secondary"
                onClick={back}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {currentStepName !== 'User type' && (
              step < STEPS.length - 1 ? (
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
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
