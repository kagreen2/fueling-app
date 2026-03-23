'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Team {
  id: string
  name: string
  sport: string | null
  description: string | null
  invite_code: string
  created_at: string
  memberCount: number
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function CoachTeamsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', sport: '', description: '' })
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Verify coach role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'coach' && profile.role !== 'super_admin')) {
      router.push('/login')
      return
    }

    // Get teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, sport, description, invite_code, created_at')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    if (!teamsData) {
      setTeams([])
      setLoading(false)
      return
    }

    // Get member counts
    const teamIds = teamsData.map(t => t.id)
    const { data: members } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)

    const countMap: Record<string, number> = {}
    for (const m of (members || [])) {
      countMap[m.team_id] = (countMap[m.team_id] || 0) + 1
    }

    setTeams(teamsData.map(t => ({
      ...t,
      memberCount: countMap[t.id] || 0,
    })))
    setLoading(false)
  }

  async function createTeam() {
    if (!newTeam.name.trim()) {
      setError('Team name is required')
      return
    }
    setCreating(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()

      if (!existing) break
      inviteCode = generateInviteCode()
      attempts++
    }

    const { error: insertError } = await supabase
      .from('teams')
      .insert({
        name: newTeam.name.trim(),
        sport: newTeam.sport.trim() || null,
        description: newTeam.description.trim() || null,
        coach_id: user.id,
        invite_code: inviteCode,
      })

    if (insertError) {
      setError('Failed to create team: ' + insertError.message)
      setCreating(false)
      return
    }

    setNewTeam({ name: '', sport: '', description: '' })
    setShowCreate(false)
    setCreating(false)
    loadTeams()
  }

  async function deleteTeam(teamId: string) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (!error) {
      setDeleteConfirm(null)
      loadTeams()
    }
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading teams...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.push('/coach/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Manage Teams</h1>
              <p className="text-slate-400 text-sm">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Create Team
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Create Team Form */}
        {showCreate && (
          <div className="bg-slate-800/80 border border-purple-500/30 rounded-xl p-5 animate-in slide-in-from-top-2">
            <h3 className="text-white font-semibold mb-4">Create New Team</h3>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Team Name *</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g., Varsity Football"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Sport</label>
                <input
                  type="text"
                  value={newTeam.sport}
                  onChange={e => setNewTeam({ ...newTeam, sport: e.target.value })}
                  placeholder="e.g., Football"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Optional team description..."
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600 placeholder-slate-500 resize-none"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={createTeam}
                  disabled={creating}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setError('') }}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 && !showCreate ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Teams Yet</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Create your first team and share the invite code with your athletes. They'll enter the code during signup to join your team.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          teams.map(team => (
            <div key={team.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{team.name}</h3>
                    <p className="text-slate-400 text-sm">
                      {team.sport || 'No sport specified'} · {team.memberCount} athlete{team.memberCount !== 1 ? 's' : ''}
                    </p>
                    {team.description && (
                      <p className="text-slate-500 text-sm mt-1">{team.description}</p>
                    )}
                  </div>
                </div>

                {/* Invite Code Section */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Invite Code</p>
                      <p className="text-2xl font-mono font-bold text-purple-400 tracking-widest">{team.invite_code}</p>
                    </div>
                    <button
                      onClick={() => copyInviteCode(team.invite_code)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        copiedCode === team.invite_code
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {copiedCode === team.invite_code ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copy Code
                        </span>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">Share this code with your athletes. They'll enter it during signup to join this team.</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => router.push(`/coach/dashboard?team=${team.id}`)}
                    className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-sm font-medium rounded-lg border border-purple-500/20 transition-colors"
                  >
                    View Athletes
                  </button>
                  {deleteConfirm === team.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-sm">Delete this team?</span>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(team.id)}
                      className="px-4 py-2 bg-slate-700/50 hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-sm font-medium rounded-lg border border-slate-700 hover:border-red-500/20 transition-colors"
                    >
                      Delete Team
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
