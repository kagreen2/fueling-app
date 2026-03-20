'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

type Stats = {
  totalUsers: number
  totalAthletes: number
  totalCoaches: number
  totalAdmins: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData || !['admin', 'super_admin'].includes(profileData.role)) {
        router.push('/athlete/dashboard')
        return
      }

      setProfile(profileData)

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (allProfiles) {
        setProfiles(allProfiles)
        setStats({
          totalUsers: allProfiles.length,
          totalAthletes: allProfiles.filter(p => p.role === 'athlete').length,
          totalCoaches: allProfiles.filter(p => p.role === 'coach').length,
          totalAdmins: allProfiles.filter(p => ['admin', 'super_admin'].includes(p.role)).length,
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleRoleChange(profileId: string, newRole: string) {
    setUpdatingId(profileId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    if (!error) {
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, role: newRole } : p
      ))
      setStats(prev => {
        if (!prev) return prev
        const updated = profiles.map(p =>
          p.id === profileId ? { ...p, role: newRole } : p
        )
        return {
          totalUsers: updated.length,
          totalAthletes: updated.filter(p => p.role === 'athlete').length,
          totalCoaches: updated.filter(p => p.role === 'coach').length,
          totalAdmins: updated.filter(p => ['admin', 'super_admin'].includes(p.role)).length,
        }
      })
    }
    setUpdatingId(null)
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return

    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (res.ok) {
      setProfiles(prev => prev.filter(p => p.id !== userId))
      setStats(prev => {
        if (!prev) return prev
        const updated = profiles.filter(p => p.id !== userId)
        return {
          totalUsers: updated.length,
          totalAthletes: updated.filter(p => p.role === 'athlete').length,
          totalCoaches: updated.filter(p => p.role === 'coach').length,
          totalAdmins: updated.filter(p => ['admin', 'super_admin'].includes(p.role)).length,
        }
      })
    } else {
      alert('Failed to delete user.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'admin': return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      case 'coach': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'athlete': return 'text-green-400 bg-green-400/10 border-green-400/20'
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading admin console...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-zinc-500 text-sm mb-1">Admin Console</p>
            <h1 className="text-2xl font-bold">Fuel Different ⚡</h1>
            {profile && (
              <p className="text-zinc-400 text-sm mt-1">{profile.full_name} · {profile.role}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-600 hover:text-white text-sm transition-colors mt-1"
          >
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Users', value: stats.totalUsers, color: 'text-white' },
                { label: 'Athletes', value: stats.totalAthletes, color: 'text-green-400' },
                { label: 'Coaches', value: stats.totalCoaches, color: 'text-blue-400' },
                { label: 'Admins', value: stats.totalAdmins, color: 'text-orange-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-zinc-500 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-3">
              Quick actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '👤', label: 'Manage Users', desc: 'View & edit roles', tab: 'users' as const },
                { icon: '🏋️', label: 'Coach Dashboard', desc: 'Switch to coach view', href: '/coach' },
                { icon: '💊', label: 'Supplements', desc: 'Review AI flags', href: '/athlete/supplements' },
                { icon: '📊', label: 'Progress Data', desc: 'View all athletes', href: '/athlete/progress' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => action.tab ? setActiveTab(action.tab) : router.push(action.href!)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800 rounded-2xl p-4 text-left transition-all duration-200"
                >
                  <div className="text-xl mb-2">{action.icon}</div>
                  <div className="font-semibold text-sm">{action.label}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{action.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
                  All Users ({profiles.length})
                </h2>
              </div>
              <div className="divide-y divide-zinc-800">
                {profiles.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.full_name || '—'}</div>
                      <div className="text-zinc-500 text-xs truncate">{p.email}</div>
                      <div className="text-zinc-600 text-xs mt-0.5">
                        Joined {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${roleColor(p.role)}`}>
                        {p.role}
                      </span>
                      {profile.role === 'super_admin' && p.id !== profile.id && (
                        <>
                          <select
                            value={p.role}
                            disabled={updatingId === p.id}
                            onChange={e => handleRoleChange(p.id, e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-green-500 disabled:opacity-50"
                          >
                            <option value="athlete">athlete</option>
                            <option value="coach">coach</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(p.id)}
                            className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20"
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </main>
  )
}