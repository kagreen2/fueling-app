'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LightningBolt from '@/components/ui/LightningBolt'

interface Team {
  id: string
  name: string
  sport: string | null
  invite_code: string
}

interface TeamMemberCount {
  team_id: string
  count: number
}

interface Subscription {
  team_id: string
  status: string
  athlete_count: number
  current_period_end: string
  stripe_subscription_id: string
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [coachId, setCoachId] = useState('')
  const [coachEmail, setCoachEmail] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({})
  const [error, setError] = useState('')

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setCoachId(user.id)
    setCoachEmail(user.email || '')

    // Get coach's teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, sport, invite_code')
      .eq('coach_id', user.id)

    if (teamsData) {
      setTeams(teamsData)

      // Get member counts for each team
      const counts: Record<string, number> = {}
      for (const team of teamsData) {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
        counts[team.id] = count || 0
      }
      setMemberCounts(counts)

      // Get subscription status for each team
      const subs: Record<string, Subscription> = {}
      for (const team of teamsData) {
        const res = await fetch(`/api/billing/status?teamId=${team.id}`)
        const data = await res.json()
        if (data.subscription) {
          subs[team.id] = data.subscription
        }
      }
      setSubscriptions(subs)
    }

    setLoading(false)
  }

  async function handleCheckout(teamId: string) {
    setCheckoutLoading(teamId)
    setError('')

    const athleteCount = memberCounts[teamId] || 1

    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          athleteCount: Math.max(athleteCount, 1),
          coachId,
          coachEmail,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout session')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setCheckoutLoading(null)
  }

  async function handleManageBilling(teamId: string) {
    setPortalLoading(true)

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, coachId }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to open billing portal')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setPortalLoading(false)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/coach/dashboard')}
              className="text-slate-400 hover:text-white transition p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Billing</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Success/Cancel banners */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-green-300 font-semibold">Subscription activated!</p>
              <p className="text-green-400/70 text-sm mt-1">Your team now has full access to Fuel Different. Athletes can start logging meals immediately.</p>
            </div>
          </div>
        )}

        {canceled && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4">
            <p className="text-yellow-300 text-sm">Checkout was canceled. No charges were made.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Pricing info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <LightningBolt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fuel Different</h2>
              <p className="text-slate-400 text-sm">Performance nutrition tracking for teams</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-4xl font-bold text-white">$20</span>
            <span className="text-slate-400">/athlete/month</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              AI-powered meal photo analysis
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Personalized nutrition plans per athlete
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Daily wellness &amp; check-in tracking
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Coach dashboard with compliance &amp; wellness alerts
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Supplement safety scanner
            </li>
          </ul>
        </div>

        {/* Teams */}
        <h2 className="text-lg font-semibold text-white">Your Teams</h2>

        {teams.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-400 mb-4">No teams yet. Create a team first to set up billing.</p>
            <button
              onClick={() => router.push('/coach/teams')}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Create Team
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map(team => {
              const sub = subscriptions[team.id]
              const count = memberCounts[team.id] || 0
              const isActive = sub?.status === 'active'

              return (
                <div key={team.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{team.name}</h3>
                        <p className="text-slate-400 text-sm">{team.sport || 'No sport set'} &middot; {count} athlete{count !== 1 ? 's' : ''}</p>
                      </div>
                      {isActive ? (
                        <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      ) : sub?.status === 'past_due' ? (
                        <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-full">
                          Past Due
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-700 text-slate-400 text-xs font-semibold rounded-full">
                          No Subscription
                        </span>
                      )}
                    </div>

                    {isActive ? (
                      <div className="space-y-3">
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Athletes Covered</p>
                              <p className="text-white font-semibold">{sub.athlete_count}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Monthly Cost</p>
                              <p className="text-white font-semibold">${(sub.athlete_count * 20).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Renews</p>
                              <p className="text-white font-semibold">{formatDate(sub.current_period_end)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleManageBilling(team.id)}
                            disabled={portalLoading}
                            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                          >
                            {portalLoading ? 'Loading...' : 'Manage Subscription'}
                          </button>
                          <button
                            onClick={() => handleCheckout(team.id)}
                            disabled={checkoutLoading === team.id}
                            className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-medium rounded-xl transition-colors text-sm border border-purple-500/30 disabled:opacity-50"
                          >
                            Update Athletes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-sm text-slate-400">
                            {count > 0
                              ? `${count} athlete${count !== 1 ? 's' : ''} on this team. Subscribe to activate full access.`
                              : 'Add athletes to your team, then subscribe to activate their access.'}
                          </p>
                          {count > 0 && (
                            <p className="text-lg font-bold text-white mt-2">
                              ${(count * 20).toLocaleString()}<span className="text-slate-400 text-sm font-normal">/month</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleCheckout(team.id)}
                          disabled={checkoutLoading === team.id || count === 0}
                          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkoutLoading === team.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              Redirecting to checkout...
                            </span>
                          ) : count === 0 ? (
                            'Add athletes first'
                          ) : (
                            `Subscribe — $${(count * 20).toLocaleString()}/month`
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mt-8">
          <h3 className="text-white font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-300 font-medium">How does billing work?</p>
              <p className="text-slate-400 mt-1">You&apos;re billed monthly based on the number of athletes on your team at the time of subscription. You can update the athlete count anytime.</p>
            </div>
            <div>
              <p className="text-slate-300 font-medium">Can I cancel anytime?</p>
              <p className="text-slate-400 mt-1">Yes. Click &quot;Manage Subscription&quot; to cancel, update payment method, or view invoices. Your team keeps access until the end of the billing period.</p>
            </div>
            <div>
              <p className="text-slate-300 font-medium">What if I add more athletes mid-month?</p>
              <p className="text-slate-400 mt-1">Click &quot;Update Athletes&quot; to adjust your subscription. You&apos;ll be prorated for the remaining days in the billing cycle.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
