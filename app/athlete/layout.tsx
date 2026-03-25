'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  const isPaymentPage = pathname === '/athlete/payment-required'
  const isOnboardingWithPayment = pathname === '/athlete/onboarding' && searchParams.get('payment') === 'success'

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // If coming back from Stripe payment, retry after a short delay
        if (isOnboardingWithPayment) {
          await new Promise(resolve => setTimeout(resolve, 1500))
          const { data: { user: retryUser } } = await supabase.auth.getUser()
          if (!retryUser) {
            router.push('/login')
            return
          }
          await handleUser(retryUser.id)
          return
        }
        router.push('/login')
        return
      }

      await handleUser(user.id)
    }

    async function handleUser(userId: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, subscription_status')
        .eq('id', userId)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      // ALWAYS redirect non-athletes to their proper dashboards — even on payment page
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        router.push('/admin/dashboard')
        return
      }
      if (profile.role === 'coach') {
        router.push('/coach/dashboard')
        return
      }
      if (profile.role !== 'athlete') {
        router.push('/login')
        return
      }

      // --- From here, user is confirmed as an athlete ---

      // Payment page: allow through (athlete needs to see it)
      if (isPaymentPage) {
        setAuthorized(true)
        setChecking(false)
        return
      }

      // If coming from successful payment, allow access and poll for webhook
      if (isOnboardingWithPayment) {
        setAuthorized(true)
        setChecking(false)

        // Poll in background to update subscription status (webhook may take a few seconds)
        if (profile.subscription_status !== 'active') {
          let attempts = 0
          const pollInterval = setInterval(async () => {
            attempts++
            const { data: updated } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('id', userId)
              .single()

            if (updated?.subscription_status === 'active' || attempts >= 20) {
              clearInterval(pollInterval)
            }
          }, 2000)
        }
        return
      }

      // Normal access check — must have active subscription
      if (profile.subscription_status !== 'active') {
        router.push('/athlete/payment-required')
        return
      }

      setAuthorized(true)
      setChecking(false)
    }

    checkAccess()
  }, [supabase, router, pathname, isPaymentPage, isOnboardingWithPayment])

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </main>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
