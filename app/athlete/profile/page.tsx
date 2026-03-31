'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface ProfileData {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  subscription_status: string | null
  created_at: string
}

interface AthleteData {
  id: string
  dob: string | null
  sex: string | null
  grade: string | null
  height_inches: number | null
  weight_lbs: number | null
  goal_phase: string | null
  season_phase: string | null
  school: string | null
  sport: string | null
  position: string | null
  team_level: string | null
  allergies: string[]
  dietary_restrictions: string[]
  training_schedule: string | null
  onboarding_complete: boolean
}

interface NutritionRecs {
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
}

const GOAL_LABELS: Record<string, string> = {
  maintain_performance: 'Maintain Performance',
  build_muscle: 'Build Muscle',
  lose_body_fat: 'Lose Body Fat',
  recover_rebuild: 'Recover & Rebuild',
  increase_energy: 'Increase Energy',
}

const SEASON_LABELS: Record<string, string> = {
  offseason: 'Offseason',
  preseason: 'Preseason',
  in_season: 'In-Season',
  postseason: 'Postseason',
}

const SPORT_LABELS: Record<string, string> = {
  football: 'Football',
  boys_lacrosse: 'Boys Lacrosse',
  girls_lacrosse: 'Girls Lacrosse',
  boys_soccer: 'Boys Soccer',
  girls_soccer: 'Girls Soccer',
  boys_basketball: 'Boys Basketball',
  girls_basketball: 'Girls Basketball',
  baseball: 'Baseball',
  softball: 'Softball',
}

function formatHeight(inches: number | null ): string {
  if (!inches) return '—'
  const ft = Math.floor(inches / 12)
  const remaining = Math.round(inches % 12)
  return `${ft}'${remaining}"`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function calculateAge(dob: string | null): string {
  if (!dob) return '—'
  const birth = new Date(dob + 'T12:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return `${age} years old`
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [athlete, setAthlete] = useState<AthleteData | null>(null)
  const [recs, setRecs] = useState<NutritionRecs | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [joiningTeam, setJoiningTeam] = useState(false)
  const [teamInfo, setTeamInfo] = useState<{ id: string; name: string; sport: string | null } | null>(null)
  const [teamError, setTeamError] = useState('')
  const [teamSuccess, setTeamSuccess] = useState('')
  const [currentTeams, setCurrentTeams] = useState<{ id: string; name: string; sport: string | null }[]>([])

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    weight_lbs: '',
    goal_phase: '',
    season_phase: '',
    training_schedule: '',
    allergies: '',
    dietary_restrictions: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) setProfile(profileData)

    const { data: athleteData } = await supabase
      .from('athletes')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    if (athleteData) {
      setAthlete(athleteData)

      // Load nutrition recommendations
      const { data: recsData } = await supabase
        .from('nutrition_recommendations')
        .select('*')
        .eq('athlete_id', athleteData.id)
        .single()

      if (recsData) setRecs(recsData)

      // Load current team memberships
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('athlete_id', athleteData.id)

      if (memberships && memberships.length > 0) {
        const teamIds = memberships.map(m => m.team_id)
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, sport')
          .in('id', teamIds)
        if (teamsData) setCurrentTeams(teamsData)
      }
    }

    setLoading(false)
  }

  function startEditing() {
    if (!profile || !athlete) return
    setEditForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      weight_lbs: athlete.weight_lbs?.toString() || '',
      goal_phase: athlete.goal_phase || '',
      season_phase: athlete.season_phase || '',
      training_schedule: athlete.training_schedule || '',
      allergies: athlete.allergies?.join(', ') || '',
      dietary_restrictions: athlete.dietary_restrictions?.join(', ') || '',
    })
    setEditing(true)
    setError('')
    setSuccess('')
  }

  async function handleSave() {
    if (!profile || !athlete) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        phone: editForm.phone || null,
      })
      .eq('id', user.id)

    if (profileError) {
      setError('Failed to update profile: ' + profileError.message)
      setSaving(false)
      return
    }

    // Update athlete
    const { error: athleteError } = await supabase
      .from('athletes')
      .update({
        weight_lbs: (() => {
          const parsed = parseFloat(editForm.weight_lbs)
          if (isNaN(parsed) || parsed <= 0) return athlete.weight_lbs
          return parsed
        })(),
        goal_phase: editForm.goal_phase || athlete.goal_phase,
        season_phase: editForm.season_phase || athlete.season_phase,
        training_schedule: editForm.training_schedule || athlete.training_schedule,
        allergies: editForm.allergies ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        dietary_restrictions: editForm.dietary_restrictions ? editForm.dietary_restrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
      })
      .eq('profile_id', user.id)

    if (athleteError) {
      setError('Failed to update athlete data: ' + athleteError.message)
      setSaving(false)
      return
    }

    // Regenerate nutrition recommendations with updated data
    let recsUpdated = false
    try {
      const recsRes = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: athlete.id }),
      })
      recsUpdated = recsRes.ok
    } catch (e) {
      console.error('Error regenerating recommendations:', e)
    }

    setEditing(false)
    setSaving(false)
    setSuccess(
      recsUpdated
        ? 'Profile updated! Your nutrition targets have been recalculated.'
        : 'Profile updated! However, nutrition targets could not be recalculated at this time.'
    )
    await loadProfile()

    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleManageSubscription() {
    if (!profile) return
    setPortalLoading(true)
    setError('')

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Unable to open billing portal. Please try again.')
        setPortalLoading(false)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setPortalLoading(false)
    }
  }

  async function handleJoinTeam() {
    if (!teamCode.trim() || !athlete) return
    setJoiningTeam(true)
    setTeamError('')
    setTeamSuccess('')

    try {
      // Look up team by invite code
      const { data: team, error: lookupError } = await supabase
        .from('teams')
        .select('id, name, sport, coach_id')
        .eq('invite_code', teamCode.trim().toUpperCase())
        .single()

      if (lookupError || !team) {
        setTeamError('No team found with that invite code. Please check and try again.')
        setJoiningTeam(false)
        return
      }

      // Check if already a member
      if (currentTeams.some(t => t.id === team.id)) {
        setTeamError(`You're already a member of ${team.name}.`)
        setJoiningTeam(false)
        return
      }

      // Join the team
      const { error: joinError } = await supabase
        .from('team_members')
        .upsert({
          team_id: team.id,
          athlete_id: athlete.id,
        }, { onConflict: 'team_id,athlete_id' })

      if (joinError) {
        setTeamError('Failed to join team: ' + joinError.message)
        setJoiningTeam(false)
        return
      }

      // Auto-assign the team's coach to this athlete
      if (team.coach_id) {
        await supabase
          .from('athlete_coach_assignments')
          .upsert({
            athlete_id: athlete.id,
            coach_id: team.coach_id,
          }, { onConflict: 'athlete_id' })
      }

      setCurrentTeams(prev => [...prev, team])
      setTeamSuccess(`Successfully joined ${team.name}!`)
      setTeamCode('')
    } catch (e) {
      setTeamError('Something went wrong. Please try again.')
    }

    setJoiningTeam(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">👤</div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-xs text-slate-400">Manage your athlete profile</p>
          </div>
          {!editing && (
            <button
              onClick={startEditing}
              className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Profile Header Card */}
        <Card className="mb-6 bg-gradient-to-br from-purple-600/10 to-purple-600/5 border-purple-600/20">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:border-purple-600 transition-colors"
                  />
                ) : (
                  <h2 className="text-xl font-bold truncate">{profile?.full_name}</h2>
                )}
                <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management Card */}
        {!editing && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Subscription</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {profile?.subscription_status === 'active'
                      ? 'Active — $20/month'
                      : profile?.subscription_status === 'past_due'
                      ? 'Past due — please update payment'
                      : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-slate-300 rounded-lg transition-colors font-medium"
                >
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Update payment method, view invoices, or cancel subscription
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        {!editing && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Phone</p>
                  <p className="text-sm text-white">{profile?.phone || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {editing && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Phone</p>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Athlete Details */}
        {athlete && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Date of Birth</p>
                    <p className="text-sm text-white">{formatDate(athlete.dob)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Age</p>
                    <p className="text-sm text-white">{calculateAge(athlete.dob)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Sex</p>
                    <p className="text-sm text-white capitalize">{athlete.sex || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Grade</p>
                    <p className="text-sm text-white">{athlete.grade || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Height</p>
                    <p className="text-sm text-white">{formatHeight(athlete.height_inches)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Weight</p>
                    {editing ? (
                      <input
                        type="number"
                        value={editForm.weight_lbs}
                        onChange={e => setEditForm(prev => ({ ...prev, weight_lbs: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    ) : (
                      <p className="text-sm text-white">{athlete.weight_lbs ? `${athlete.weight_lbs} lbs` : '—'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Sport</p>
                    <p className="text-sm text-white">{SPORT_LABELS[athlete.sport || ''] || athlete.sport || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Position</p>
                    <p className="text-sm text-white capitalize">{athlete.position || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">School</p>
                    <p className="text-sm text-white">{athlete.school || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">Team Level</p>
                    <p className="text-sm text-white capitalize">{athlete.team_level || '—'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Season Phase</p>
                  {editing ? (
                    <select
                      value={editForm.season_phase}
                      onChange={e => setEditForm(prev => ({ ...prev, season_phase: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                    >
                      {Object.entries(SEASON_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-white">{SEASON_LABELS[athlete.season_phase || ''] || athlete.season_phase || '—'}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Training Schedule</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.training_schedule}
                      onChange={e => setEditForm(prev => ({ ...prev, training_schedule: e.target.value }))}
                      placeholder="e.g., 5 days/week"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500"
                    />
                  ) : (
                    <p className="text-sm text-white">{athlete.training_schedule || '—'}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Goal</p>
                  {editing ? (
                    <select
                      value={editForm.goal_phase}
                      onChange={e => setEditForm(prev => ({ ...prev, goal_phase: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                    >
                      {Object.entries(GOAL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-white">{GOAL_LABELS[athlete.goal_phase || ''] || athlete.goal_phase || '—'}</p>
                  )}
                </div>

                {/* Nutrition Targets */}
                {recs && !editing && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2">Your Daily Targets</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">{recs.daily_calories}</p>
                        <p className="text-xs text-slate-400">Calories</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{recs.daily_protein_g}g</p>
                        <p className="text-xs text-slate-400">Protein</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">{recs.daily_carbs_g}g</p>
                        <p className="text-xs text-slate-400">Carbs</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{recs.daily_fat_g}g</p>
                        <p className="text-xs text-slate-400">Fat</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">Based on evidence-based ISSN/IOC formulas</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Allergies</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.allergies}
                      onChange={e => setEditForm(prev => ({ ...prev, allergies: e.target.value }))}
                      placeholder="e.g., peanuts, shellfish (comma separated)"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500"
                    />
                  ) : (
                    <p className="text-sm text-white">
                      {athlete.allergies && athlete.allergies.length > 0
                        ? athlete.allergies.join(', ')
                        : 'None'}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Dietary Restrictions</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.dietary_restrictions}
                      onChange={e => setEditForm(prev => ({ ...prev, dietary_restrictions: e.target.value }))}
                      placeholder="e.g., vegetarian, gluten-free (comma separated)"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500"
                    />
                  ) : (
                    <p className="text-sm text-white">
                      {athlete.dietary_restrictions && athlete.dietary_restrictions.length > 0
                        ? athlete.dietary_restrictions.join(', ')
                        : 'None'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Action Buttons */}
        {editing && (
          <div className="space-y-3 mb-6">
            <Button
              onClick={handleSave}
              isLoading={saving}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={() => { setEditing(false); setError('') }}
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Saving will recalculate your personalized nutrition targets
            </p>
          </div>
        )}

        {/* Join a Team */}
        {!editing && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white">Team</p>
                  <p className="text-xs text-slate-400 mt-1">Join a team using an invite code from your coach</p>
                </div>

                {/* Current teams */}
                {currentTeams.length > 0 && (
                  <div className="space-y-2">
                    {currentTeams.map(team => (
                      <div key={team.id} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                        <span className="text-green-400 text-sm">&#10003;</span>
                        <div>
                          <p className="text-sm text-white font-medium">{team.name}</p>
                          {team.sport && <p className="text-xs text-slate-400 capitalize">{team.sport.replace(/_/g, ' ')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Join form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teamCode}
                    onChange={e => { setTeamCode(e.target.value.toUpperCase()); setTeamError(''); setTeamSuccess(''); }}
                    placeholder="Enter invite code"
                    maxLength={10}
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-500 uppercase"
                  />
                  <button
                    onClick={handleJoinTeam}
                    disabled={joiningTeam || !teamCode.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {joiningTeam ? 'Joining...' : 'Join'}
                  </button>
                </div>

                {teamError && (
                  <p className="text-xs text-red-400">{teamError}</p>
                )}
                {teamSuccess && (
                  <p className="text-xs text-green-400">{teamSuccess}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Re-run Onboarding */}
        {!editing && (
          <Card className="mb-6 border-slate-700/50">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Update Full Profile</p>
                  <p className="text-xs text-slate-400 mt-1">Re-run the intake form to update all your info</p>
                </div>
                <button
                  onClick={() => router.push('/athlete/onboarding')}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Re-run Intake
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Out */}
        {!editing && (
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3 text-center text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all text-sm font-medium"
            >
              Sign Out
            </button>
            <a
              href="mailto:kelly@crossfitironflag.com?subject=Fuel Different — Support Request"
              className="block w-full py-3 text-center text-slate-400 hover:text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-all text-sm font-medium"
            >
              Contact Support
            </a>
            <p className="text-xs text-slate-600 text-center">
              Fuel Different v1.0
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
