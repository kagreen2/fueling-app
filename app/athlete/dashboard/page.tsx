'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface QuickAction {
  id: string
  icon: string
  label: string
  description: string
  href: string
  color: 'green' | 'blue' | 'purple' | 'orange'
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'checkin',
    icon: '✅',
    label: 'Daily Check-in',
    description: 'Log how you feel',
    href: '/athlete/checkin',
    color: 'green',
  },
  {
    id: 'meals',
    icon: '🍽️',
    label: 'Log a Meal',
    description: 'Photo or description',
    href: '/athlete/meals',
    color: 'orange',
  },
  {
    id: 'hydration',
    icon: '💧',
    label: 'Hydration',
    description: 'Track water intake',
    href: '/athlete/hydration',
    color: 'blue',
  },
  {
    id: 'progress',
    icon: '📈',
    label: 'Progress',
    description: 'View your trends',
    href: '/athlete/progress',
    color: 'purple',
  },
]

const colorMap = {
  green: 'hover:border-green-500/50 hover:bg-slate-700/50',
  blue: 'hover:border-blue-500/50 hover:bg-slate-700/50',
  purple: 'hover:border-purple-500/50 hover:bg-slate-700/50',
  orange: 'hover:border-orange-500/50 hover:bg-slate-700/50',
}

export default function AthleteDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      const { data: athleteData } = await supabase
        .from('athletes')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      setLoading(false)

      if (athleteData && !athleteData.onboarding_complete) {
        router.push('/athlete/onboarding')
      }
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-r-green-500 mb-4" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
            {greeting()} 👋
          </h1>
              {profile && (
                <p className="text-sm text-slate-400 mt-1">{profile.full_name}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Sign out"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        
        {/* Today's Targets Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Today's Targets
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Calories"
              value="—"
              unit="kcal"
              icon="🔥"
              color="red"
              size="sm"
            />
            <StatCard
              label="Protein"
              value="—"
              unit="g"
              icon="💪"
              color="green"
              size="sm"
            />
            <StatCard
              label="Water"
              value="—"
              unit="oz"
              icon="💧"
              color="blue"
              size="sm"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-purple-500 hover:text-purple-400"
            onClick={() => router.push('/athlete/onboarding')}
          >
            Complete setup to unlock personalized targets →
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => router.push(action.href)}
                className={`
                  bg-slate-800 border border-slate-700 rounded-2xl p-4
                  text-left transition-all duration-200 active:scale-95
                  hover:border-purple-600/50 hover:bg-slate-700/50
                `}
              >
                <div className="text-3xl mb-3">{action.icon}</div>
                <h3 className="font-semibold text-sm text-white">{action.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Supplements Section */}
        <Card>
          <CardHeader
            title="Supplements"
            action={
              <button
                onClick={() => router.push('/athlete/supplements')}
                className="text-green-400 hover:text-green-300 text-sm font-semibold transition-colors"
              >
                + Add
              </button>
            }
          />
          <CardContent>
            <p className="text-sm text-slate-400">No supplements logged yet.</p>
            <p className="text-xs text-slate-500 mt-2">
              Add a supplement to get an AI safety review from our coaches.
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <div className="mt-8 pt-8 border-t border-slate-800">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          <Card>
            <CardContent>
              <p className="text-sm text-slate-400 text-center py-8">
                Start logging to see your activity here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
