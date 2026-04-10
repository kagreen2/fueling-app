'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Organization } from '@/lib/organizations/types'

interface Team {
  id: string
  name: string
  sport: string | null
  org_id: string | null
  coach_id: string
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  org_id: string | null
}

const COLOR_PRESETS = [
  { name: 'Purple', color: '#9333EA' },
  { name: 'Blue', color: '#2563EB' },
  { name: 'Red', color: '#DC2626' },
  { name: 'Orange', color: '#EA580C' },
  { name: 'Green', color: '#16A34A' },
  { name: 'Teal', color: '#0D9488' },
  { name: 'Pink', color: '#DB2777' },
  { name: 'Indigo', color: '#4F46E5' },
  { name: 'Amber', color: '#D97706' },
  { name: 'Slate', color: '#475569' },
]

export default function OrganizationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [coaches, setCoaches] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit/Create modal state
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo_url: '',
    primary_color: '#9333EA',
    accent_color: '#22C55E',
    background_color: '#0F172A',
    contact_email: '',
    sport: '',
    website: '',
    custom_email_from: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Verify admin access
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        router.push('/login')
        return
      }

      // Load organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: true })

      if (orgsData) setOrgs(orgsData)

      // Load teams for assignment
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, sport, org_id, coach_id')
        .order('name')

      if (teamsData) setTeams(teamsData)

      // Load coaches for assignment
      const { data: coachesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, org_id')
        .in('role', ['coach', 'admin', 'super_admin'])
        .order('full_name')

      if (coachesData) setCoaches(coachesData)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
    setLoading(false)
  }

  function openCreate() {
    setForm({
      name: '',
      slug: '',
      logo_url: '',
      primary_color: '#9333EA',
      accent_color: '#22C55E',
      background_color: '#0F172A',
      contact_email: '',
      sport: '',
      website: '',
      custom_email_from: '',
    })
    setIsCreating(true)
    setEditingOrg({})
    setError('')
    setSuccess('')
  }

  function openEdit(org: Organization) {
    setForm({
      name: org.name,
      slug: org.slug,
      logo_url: org.logo_url || '',
      primary_color: org.primary_color,
      accent_color: org.accent_color,
      background_color: org.background_color,
      contact_email: org.contact_email || '',
      sport: org.sport || '',
      website: org.website || '',
      custom_email_from: org.custom_email_from || '',
    })
    setIsCreating(false)
    setEditingOrg(org)
    setError('')
    setSuccess('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Organization name is required'); return }
    if (!form.slug.trim()) { setError('Subdomain slug is required'); return }
    if (!/^[a-z0-9-]+$/.test(form.slug)) { setError('Slug must be lowercase letters, numbers, and hyphens only'); return }

    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      logo_url: form.logo_url.trim() || null,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      background_color: form.background_color,
      contact_email: form.contact_email.trim() || null,
      sport: form.sport.trim() || null,
      website: form.website.trim() || null,
      custom_email_from: form.custom_email_from.trim() || null,
    }

    try {
      if (isCreating) {
        const { data, error: insertError } = await supabase
          .from('organizations')
          .insert(payload)
          .select()
          .single()

        if (insertError) {
          if (insertError.message.includes('duplicate')) {
            setError('An organization with this slug already exists')
          } else {
            setError(insertError.message)
          }
          setSaving(false)
          return
        }

        setOrgs(prev => [...prev, data])
        setSuccess(`"${data.name}" created successfully!`)
      } else {
        const { error: updateError } = await supabase
          .from('organizations')
          .update(payload)
          .eq('id', editingOrg!.id!)

        if (updateError) {
          setError(updateError.message)
          setSaving(false)
          return
        }

        setOrgs(prev => prev.map(o => o.id === editingOrg!.id ? { ...o, ...payload } : o))
        setSuccess(`"${payload.name}" updated successfully!`)
      }

      setEditingOrg(null)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(orgId: string, orgName: string) {
    if (!confirm(`Are you sure you want to delete "${orgName}"? Teams and coaches will be unlinked but not deleted.`)) return

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      setError(error.message)
      return
    }

    setOrgs(prev => prev.filter(o => o.id !== orgId))
    setTeams(prev => prev.map(t => t.org_id === orgId ? { ...t, org_id: null } : t))
    setCoaches(prev => prev.map(c => c.org_id === orgId ? { ...c, org_id: null } : c))
    setSuccess(`"${orgName}" deleted.`)
  }

  async function assignTeamToOrg(teamId: string, orgId: string | null) {
    const { error } = await supabase
      .from('teams')
      .update({ org_id: orgId })
      .eq('id', teamId)

    if (!error) {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, org_id: orgId } : t))
    }
  }

  async function assignCoachToOrg(coachId: string, orgId: string | null) {
    const { error } = await supabase
      .from('profiles')
      .update({ org_id: orgId })
      .eq('id', coachId)

    if (!error) {
      setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, org_id: orgId } : c))
    }
  }

  // Count teams and coaches per org
  const orgStats = useMemo(() => {
    const stats: Record<string, { teams: number; coaches: number }> = {}
    for (const org of orgs) {
      stats[org.id] = {
        teams: teams.filter(t => t.org_id === org.id).length,
        coaches: coaches.filter(c => c.org_id === org.id).length,
      }
    }
    return stats
  }, [orgs, teams, coaches])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading organizations...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Admin
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Organizations</h1>
              <p className="text-slate-400 text-sm">White-label branding management</p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + New Organization
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Success / Error banners */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">✕</button>
          </div>
        )}
        {error && !editingOrg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Organization Cards */}
        <div className="grid gap-6">
          {orgs.map(org => (
            <div key={org.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Color preview */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-600"
                    style={{ backgroundColor: org.primary_color + '20' }}
                  >
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: org.primary_color }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{org.name}</h3>
                    <p className="text-slate-400 text-sm">
                      {org.slug}.fueldifferent.com
                      {org.sport && <span className="text-slate-500"> · {org.sport}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: org.primary_color }} />
                        <span className="text-xs text-slate-500">Primary</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: org.accent_color }} />
                        <span className="text-xs text-slate-500">Accent</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {orgStats[org.id]?.teams || 0} teams · {orgStats[org.id]?.coaches || 0} coaches
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(org)}
                    className="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {org.slug !== 'default' && (
                    <button
                      onClick={() => handleDelete(org.id, org.name)}
                      className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Teams assigned to this org */}
              {(orgStats[org.id]?.teams > 0 || orgStats[org.id]?.coaches > 0) && (
                <div className="border-t border-slate-700 px-5 py-3 bg-slate-800/30">
                  <div className="flex flex-wrap gap-2">
                    {teams.filter(t => t.org_id === org.id).map(team => (
                      <span key={team.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-300">
                        {team.name}
                        <button
                          onClick={() => assignTeamToOrg(team.id, null)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove from org"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {coaches.filter(c => c.org_id === org.id).map(coach => (
                      <span key={coach.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-lg text-xs text-purple-300">
                        {coach.full_name} (coach)
                        <button
                          onClick={() => assignCoachToOrg(coach.id, null)}
                          className="text-purple-500 hover:text-red-400 transition-colors"
                          title="Remove from org"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {orgs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">No organizations yet.</p>
              <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white">
                Create Your First Organization
              </Button>
            </div>
          )}
        </div>

        {/* Unassigned Teams & Coaches */}
        {(teams.some(t => !t.org_id) || coaches.some(c => !c.org_id)) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Unassigned</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              {teams.filter(t => !t.org_id).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Teams without an organization:</h3>
                  <div className="flex flex-wrap gap-2">
                    {teams.filter(t => !t.org_id).map(team => (
                      <div key={team.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                        {team.name}
                        <select
                          onChange={e => {
                            if (e.target.value) assignTeamToOrg(team.id, e.target.value)
                          }}
                          className="bg-slate-800 border border-slate-600 text-xs text-slate-300 rounded px-1.5 py-0.5"
                          defaultValue=""
                        >
                          <option value="" disabled>Assign to...</option>
                          {orgs.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {coaches.filter(c => !c.org_id).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Coaches without an organization:</h3>
                  <div className="flex flex-wrap gap-2">
                    {coaches.filter(c => !c.org_id).map(coach => (
                      <div key={coach.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                        {coach.full_name}
                        <select
                          onChange={e => {
                            if (e.target.value) assignCoachToOrg(coach.id, e.target.value)
                          }}
                          className="bg-slate-800 border border-slate-600 text-xs text-slate-300 rounded px-1.5 py-0.5"
                          defaultValue=""
                        >
                          <option value="" disabled>Assign to...</option>
                          {orgs.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editingOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
              <h2 className="text-lg font-bold text-white">
                {isCreating ? 'Create Organization' : `Edit: ${editingOrg.name}`}
              </h2>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Organization Name *</label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Lincoln High School"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Subdomain Slug *</label>
                    <div className="flex items-center gap-0">
                      <Input
                        value={form.slug}
                        onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        placeholder="lincolnhigh"
                        className="rounded-r-none"
                      />
                      <span className="bg-slate-700 border border-l-0 border-slate-600 text-slate-400 text-xs px-2 py-2.5 rounded-r-lg whitespace-nowrap">
                        .fueldifferent.com
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Sport</label>
                    <Input
                      value={form.sport}
                      onChange={e => setForm(prev => ({ ...prev, sport: e.target.value }))}
                      placeholder="Football, CrossFit, etc."
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Contact Email</label>
                    <Input
                      type="email"
                      value={form.contact_email}
                      onChange={e => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="coach@school.edu"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Website</label>
                    <Input
                      value={form.website}
                      onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://lincolnhigh.edu"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-1.5 block">Email "From" Name</label>
                    <Input
                      value={form.custom_email_from}
                      onChange={e => setForm(prev => ({ ...prev, custom_email_from: e.target.value }))}
                      placeholder="Lincoln Fuel"
                    />
                    <p className="text-xs text-slate-500 mt-1">Appears as sender in daily reports</p>
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Logo</h3>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1.5 block">Logo URL</label>
                  <Input
                    value={form.logo_url}
                    onChange={e => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-slate-500 mt-1">Upload your logo to any image host and paste the URL here. Recommended: 200x200px PNG with transparent background.</p>
                </div>
                {form.logo_url && (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center">
                      <img src={form.logo_url} alt="Logo preview" className="w-12 h-12 object-contain" />
                    </div>
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: form.primary_color + '20' }}>
                      <img src={form.logo_url} alt="Logo on brand bg" className="w-12 h-12 object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Brand Colors</h3>

                {/* Primary Color */}
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">Primary Color</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.color}
                        onClick={() => setForm(prev => ({ ...prev, primary_color: preset.color }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          form.primary_color === preset.color ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#9333EA"
                      className="w-32"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Preview:</span>
                      <span
                        className="px-3 py-1 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: form.primary_color }}
                      >
                        Button
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: form.primary_color }}
                      >
                        Link Text
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={form.accent_color}
                      onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                      placeholder="#22C55E"
                      className="w-32"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Preview:</span>
                      <span
                        className="px-3 py-1 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: form.accent_color }}
                      >
                        Badge
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-3">Live Preview</p>
                  <div className="flex items-center gap-3 mb-3">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.primary_color }} />
                    )}
                    <span className="text-white font-bold">{form.name || 'Organization Name'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                      style={{ backgroundColor: form.primary_color }}
                    >
                      Primary Button
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                      style={{ backgroundColor: form.accent_color }}
                    >
                      Accent Badge
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: form.primary_color }}
                    >
                      Link →
                    </span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-6 py-2 rounded-lg"
                >
                  {saving ? 'Saving...' : isCreating ? 'Create Organization' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
