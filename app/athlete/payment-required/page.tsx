'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function PaymentRequiredPage( ) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')

  const wasCanceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if already paid
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, full_name')
        .eq('id', user.id)
        .single()

      if (profile?.subscription_status === 'active') {
        router.push('/athlete/onboarding')
        return
      }

      setUserId(user.id)
      setUserEmail(user.email || '')
      setUserName(profile?.full_name || '')
      setCheckingAuth(false)
    }
    checkUser()
  }, [supabase, router])

  async function handleCheckout() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/billing/athlete-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail,
          fullName: userName,
        }),
      })

      const checkout = await res.json()

      if (checkout.url) {
        window.location.href = checkout.url
      } else {
        setError(checkout.error || 'Failed to create checkout session.')
        setLoading(false)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Checking account status...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Subscription</h1>
          <p className="text-slate-400">
            {wasCanceled
              ? 'Your payment was canceled. You can try again below.'
              : 'One more step — activate your account to start fueling your performance.'}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur">
          {/* Plan details */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg">Fuel Different</h3>
                <p className="text-slate-400 text-sm">Monthly athlete plan</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">$20</div>
                <div className="text-slate-400 text-sm">/month</div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span> AI-powered meal photo analysis
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span> Personalized nutrition targets
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span> Daily wellness check-ins
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span> Progress tracking & insights
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span> Coach accountability integration
              </div>
            </div>
          </div>

          {/* Promo code note */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-purple-300/80">
              🎟️ Have a promo code from your coach or club? You can enter it on the next page at checkout.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold py-3 rounded-xl text-lg transition-colors"
          >
            {loading ? 'Preparing checkout...' : 'Subscribe — $20/month'}
          </Button>

          <p className="text-xs text-slate-500 text-center mt-3">
            Cancel anytime. Secure payment powered by Stripe.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-500 text-sm">
            Signed in as <span className="text-slate-400">{userEmail}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="text-slate-500 text-sm hover:text-slate-400 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
