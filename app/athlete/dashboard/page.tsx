'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AthleteDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
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
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-zinc-500 text-sm mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold">{greeting()} 👋</h1>
            {profile && (
              <p className="text-zinc-400 text-sm mt-1">{profile.full_name}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-600 hover:text-white text-sm transition-colors mt-1"
          >
            Sign out
          </button>
        </div>

        {/* Today's targets */}
        <div className="bg-zinc-900 rounded-2xl p-5 mb-6 border border-zinc-800">
          <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
            Today's targets
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">—</div>
              <div className="text-zinc-500 text-xs mt-1">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">—</div>
              <div className="text-zinc-500 text-xs mt-1">Protein (g)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">—</div>
              <div className="text-zinc-500 text-xs mt-1">Water (oz)</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/athlete/onboarding')}
            className="w-full mt-4 text-xs text-green-500 hover:text-green-400 transition-colors"
          >
            Complete setup to unlock personalized targets →
          </button>
        </div>

        {/* Quick actions */}
        <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: '✅', label: 'Daily check-in', desc: 'Log how you feel', href: '/athlete/checkin' },
            { icon: '🍽️', label: 'Log a meal', desc: 'Photo or description', href: '/athlete/meals' },
            { icon: '💧', label: 'Hydration', desc: 'Track water intake', href: '/athlete/hydration' },
            { icon: '📈', label: 'Progress', desc: 'View your trends', href: '/athlete/progress' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="bg-zinc-900 border border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800 rounded-2xl p-4 text-left transition-all duration-200"
            >
              <div className="text-xl mb-2">{action.icon}</div>
              <div className="font-semibold text-sm">{action.label}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{action.desc}</div>
            </button>
          ))}
        </div>

        {/* Supplements */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
              Supplements
            </h2>
            <button
              onClick={() => router.push('/athlete/supplements')}
              className="text-green-500 hover:text-green-400 text-sm transition-colors font-medium"
            >
              + Add
            </button>
          </div>
          <p className="text-zinc-600 text-sm">No supplements logged yet.</p>
        </div>

      </div>
    </main>
  )
}