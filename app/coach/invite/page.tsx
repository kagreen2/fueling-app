'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Team {
  id: string
  name: string
  sport: string | null
  invite_code: string
}

interface Invitation {
  id: string
  email: string
  team_id: string
  status: 'pending' | 'accepted' | 'expired'
  sent_at: string
  accepted_at: string | null
}

interface SendResults {
  sent: string[]
  alreadyRegistered: string[]
  alreadyInvited: string[]
  failed: string[]
  invalid: string[]
}

export default function CoachInvitePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [invitations, setInvitations] = useState<Invitation[]>([])

  // Input modes
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual')
  const [singleEmail, setSingleEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [csvFileName, setCsvFileName] = useState('')

  // State
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResults | null>(null)
  const [error, setError] = useState('')
  const [coachName, setCoachName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      loadInvitations(selectedTeam)
    }
  }, [selectedTeam])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.role)) {
      router.push('/login')
      return
    }

    setCoachName(profile.full_name || 'Coach')

    // Get coach's teams
    const isAdmin = ['admin', 'super_admin'].includes(profile.role)
    let teamsQuery = supabase.from('teams').select('id, name, sport, invite_code')
    if (!isAdmin) {
      teamsQuery = teamsQuery.eq('coach_id', user.id)
    }
    const { data: teamsData } = await teamsQuery
    setTeams(teamsData || [])

    if (teamsData && teamsData.length > 0) {
      setSelectedTeam(teamsData[0].id)
    }

    setLoading(false)
  }

  async function loadInvitations(teamId: string) {
    const res = await fetch(`/api/coach/invite-athletes?teamId=${teamId}`)
    if (res.ok) {
      const data = await res.json()
      setInvitations(data.invitations || [])
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      // Parse CSV — look for email column or treat each line as an email
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const emails: string[] = []

      // Check if first line is a header
      const firstLine = lines[0].toLowerCase()
      const hasHeader = firstLine.includes('email') || firstLine.includes('name') || firstLine.includes(',')
      const startIdx = hasHeader ? 1 : 0

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''))
        // Find the part that looks like an email
        const emailPart = parts.find(p => p.includes('@'))
        if (emailPart) {
          emails.push(emailPart)
        } else if (parts.length === 1 && parts[0].includes('@')) {
          emails.push(parts[0])
        }
      }

      setBulkEmails(emails.join('\n'))
    }
    reader.readAsText(file)
  }

  async function sendInvites() {
    setError('')
    setResults(null)

    if (!selectedTeam) {
      setError('Please select a team')
      return
    }

    let emailList: string[] = []

    if (mode === 'individual') {
      if (!singleEmail.trim()) {
        setError('Please enter an email address')
        return
      }
      emailList = [singleEmail.trim()]
    } else {
      if (!bulkEmails.trim()) {
        setError('Please enter email addresses or upload a CSV')
        return
      }
      // Split by newlines, commas, or semicolons
      emailList = bulkEmails
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0)
    }

    if (emailList.length === 0) {
      setError('No email addresses found')
      return
    }

    setSending(true)

    try {
      const res = await fetch('/api/coach/invite-athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailList, teamId: selectedTeam }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invitations')
        setSending(false)
        return
      }

      setResults(data.results)

      // Clear inputs on success
      if (data.results.sent.length > 0) {
        setSingleEmail('')
        setBulkEmails('')
        setCsvFileName('')
        // Refresh invitations list
        loadInvitations(selectedTeam)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations')
    }

    setSending(false)
  }

  const selectedTeamData = teams.find(t => t.id === selectedTeam)
  const pendingCount = invitations.filter(i => i.status === 'pending').length
  const acceptedCount = invitations.filter(i => i.status === 'accepted').length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/coach/dashboard')}
              className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold">Invite Athletes</h1>
            <p className="text-slate-400 mt-1">
              Send personalized invitations to join your team on Fuel Different
            </p>
          </div>
        </div>

        {/* No teams warning */}
        {teams.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
            <p className="text-amber-400 font-medium mb-2">No Teams Found</p>
            <p className="text-slate-400 text-sm mb-4">
              You need to create a team before you can invite athletes.
            </p>
            <button
              onClick={() => router.push('/coach/teams')}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create a Team
            </button>
          </div>
        ) : (
          <>
            {/* Team Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Team
              </label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} {team.sport ? `(${team.sport})` : ''} — Code: {team.invite_code}
                  </option>
                ))}
              </select>
              {selectedTeamData && (
                <p className="text-slate-500 text-sm mt-2">
                  Team invite code: <span className="text-green-400 font-mono font-bold">{selectedTeamData.invite_code}</span>
                </p>
              )}
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'individual'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Individual Invite
              </button>
              <button
                onClick={() => setMode('bulk')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'bulk'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Bulk Import
              </button>
            </div>

            {/* Input Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              {mode === 'individual' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Athlete Email Address
                  </label>
                  <input
                    type="email"
                    value={singleEmail}
                    onChange={e => setSingleEmail(e.target.value)}
                    placeholder="athlete@email.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyDown={e => e.key === 'Enter' && sendInvites()}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Addresses
                  </label>
                  <p className="text-slate-500 text-xs mb-3">
                    Paste email addresses (one per line, or comma/semicolon separated), or upload a CSV file.
                  </p>

                  {/* CSV Upload */}
                  <div className="mb-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded-lg px-4 py-3 text-sm text-slate-300 w-full flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {csvFileName ? `Loaded: ${csvFileName}` : 'Upload CSV File'}
                    </button>
                  </div>

                  {/* Text area */}
                  <textarea
                    value={bulkEmails}
                    onChange={e => setBulkEmails(e.target.value)}
                    placeholder={`athlete1@email.com\nathlete2@email.com\nathlete3@email.com`}
                    rows={8}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  />
                  {bulkEmails && (
                    <p className="text-slate-500 text-xs mt-2">
                      {bulkEmails.split(/[\n,;]+/).filter(e => e.trim()).length} email(s) detected
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={sendInvites}
                disabled={sending}
                className="mt-4 w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Invitation{mode === 'bulk' ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {results && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Results</h3>
                <div className="space-y-3">
                  {results.sent.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                      <p className="text-green-400 font-medium text-sm">
                        ✓ {results.sent.length} invitation{results.sent.length > 1 ? 's' : ''} sent successfully
                      </p>
                      <p className="text-green-400/70 text-xs mt-1">{results.sent.join(', ')}</p>
                    </div>
                  )}
                  {results.alreadyRegistered.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
                      <p className="text-blue-400 font-medium text-sm">
                        {results.alreadyRegistered.length} already have an account
                      </p>
                      <p className="text-blue-400/70 text-xs mt-1">{results.alreadyRegistered.join(', ')}</p>
                    </div>
                  )}
                  {results.alreadyInvited.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                      <p className="text-amber-400 font-medium text-sm">
                        {results.alreadyInvited.length} already have a pending invitation
                      </p>
                      <p className="text-amber-400/70 text-xs mt-1">{results.alreadyInvited.join(', ')}</p>
                    </div>
                  )}
                  {results.failed.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                      <p className="text-red-400 font-medium text-sm">
                        {results.failed.length} failed to send
                      </p>
                      <p className="text-red-400/70 text-xs mt-1">{results.failed.join(', ')}</p>
                    </div>
                  )}
                  {results.invalid.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                      <p className="text-red-400 font-medium text-sm">
                        {results.invalid.length} invalid email{results.invalid.length > 1 ? 's' : ''} skipped
                      </p>
                      <p className="text-red-400/70 text-xs mt-1">{results.invalid.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invitation History */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Invitation History</h3>
                <div className="flex gap-3 text-sm">
                  <span className="text-amber-400">{pendingCount} pending</span>
                  <span className="text-green-400">{acceptedCount} accepted</span>
                </div>
              </div>

              {invitations.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  No invitations sent yet for this team.
                </p>
              ) : (
                <div className="space-y-2">
                  {invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-slate-500">
                          Sent {new Date(inv.sent_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          inv.status === 'accepted'
                            ? 'bg-green-500/20 text-green-400'
                            : inv.status === 'expired'
                            ? 'bg-slate-500/20 text-slate-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {inv.status === 'accepted' ? 'Joined' : inv.status === 'expired' ? 'Expired' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Help text */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Need help? Contact <a href="mailto:kelly@crossfitironflag.com" className="text-purple-400 hover:text-purple-300">support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
