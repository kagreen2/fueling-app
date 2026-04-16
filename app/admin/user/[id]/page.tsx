'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  created_at: string
  subscription_status: string | null
}

interface TeamInfo {
  team_id: string
  team_name: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timeSince(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`
}

export default function AdminUserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [hasAthleteRecord, setHasAthleteRecord] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const [reminderError, setReminderError] = useState('')

  useEffect(() => {
    loadUserData()
  }, [userId])

  async function loadUserData() {
    try {
      // Verify current user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
        router.push('/athlete/dashboard')
        return
      }

      // Load target user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!userData) {
        router.push('/admin')
        return
      }

      setProfile(userData)

      // Check if they have an athlete record (completed onboarding)
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', userId)
        .single()

      if (athleteData) {
        setHasAthleteRecord(true)
        // If they have an athlete record, redirect to the full view
        router.push(`/coach/athlete/${athleteData.id}`)
        return
      }

      // Check team memberships via team_members table
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('athlete_id', userId)

      if (memberData && memberData.length > 0) {
        const teamIds = memberData.map(m => m.team_id)
        const { data: teamData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds)

        if (teamData) {
          setTeams(teamData.map(t => ({ team_id: t.id, team_name: t.name })))
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading user data:', error)
      setLoading(false)
    }
  }

  async function sendOnboardingReminder() {
    setSendingReminder(true)
    setReminderError('')
    setReminderSent(false)

    try {
      const res = await fetch('/api/admin/send-onboarding-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setReminderError(data.error || 'Failed to send reminder')
      } else {
        setReminderSent(true)
      }
    } catch (err: any) {
      setReminderError(err.message || 'Network error')
    } finally {
      setSendingReminder(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading user profile...</p>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-slate-400">User not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Dashboard
        </button>

        {/* Onboarding Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🚧</span>
          <div>
            <h3 className="text-yellow-400 font-semibold text-sm">Onboarding Incomplete</h3>
            <p className="text-yellow-400/70 text-sm mt-1">
              This user created an account but hasn&apos;t completed their profile setup. 
              They don&apos;t have nutrition targets, sport info, or body stats yet.
            </p>
          </div>
        </div>

        {/* User Profile Card */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <div className="flex items-start justify-between mb-4 border-b border-slate-700 pb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-2xl font-bold text-yellow-400">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{profile.full_name}</h1>
                <p className="text-slate-400 text-sm">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 capitalize">
                    {profile.role.replace('_', ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    Not Onboarded
                  </span>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Phone</p>
                <p className="text-white text-sm">{profile.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Signed Up</p>
                <p className="text-white text-sm">{formatDate(profile.created_at)}</p>
                <p className="text-slate-500 text-xs mt-0.5">{timeSince(profile.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Subscription</p>
                <p className="text-white text-sm capitalize">{profile.subscription_status || 'None'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Teams</p>
                {teams.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {teams.map(t => (
                      <span key={t.team_id} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {t.team_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No teams joined</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Missing Card */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <div className="border-b border-slate-700 pb-3 mb-4">
            <h2 className="text-white font-semibold">What&apos;s Missing</h2>
          </div>
          <CardContent className="pt-4">
            <p className="text-slate-400 text-sm mb-4">
              This user needs to complete onboarding to set up the following:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '🏋️', label: 'Sport & Position', desc: 'What sport they play' },
                { icon: '⚖️', label: 'Body Stats', desc: 'Weight, height, body composition' },
                { icon: '🎯', label: 'Goal Phase', desc: 'Gain mass, lose fat, maintain, etc.' },
                { icon: '📅', label: 'Season Phase', desc: 'Offseason, preseason, in-season' },
                { icon: '🍽️', label: 'Nutrition Targets', desc: 'Personalized calorie & macro goals' },
                { icon: '📊', label: 'Tracking Data', desc: 'Meals, check-ins, hydration' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-slate-300 text-sm font-medium">{item.label}</p>
                    <p className="text-slate-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Send Reminder Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="border-b border-slate-700 pb-3 mb-4">
            <h2 className="text-white font-semibold">Send Onboarding Reminder</h2>
          </div>
          <CardContent className="pt-4">
            <p className="text-slate-400 text-sm mb-4">
              Send {profile.full_name.split(' ')[0]} an email encouraging them to finish setting up their profile. 
              The email includes a direct link to the onboarding page.
            </p>

            {reminderSent && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <p className="text-green-400 text-sm">
                  Reminder sent to {profile.email}!
                </p>
              </div>
            )}

            {reminderError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <span className="text-red-400">✗</span>
                <p className="text-red-400 text-sm">{reminderError}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={sendOnboardingReminder}
                disabled={sendingReminder}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sendingReminder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email Reminder
                  </>
                )}
              </Button>

              <Button
                onClick={() => router.push('/admin')}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 px-6 rounded-xl transition-colors"
              >
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
