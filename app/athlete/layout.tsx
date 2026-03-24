'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
} ) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  // Allow the payment-required page to render without a subscription check
  const isPaymentPage = pathname === '/athlete/payment-required'

  useEffect(() => {
    if (isPaymentPage) {
      setAuthorized(true)
      setChecking(false)
      return
    }

    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, subscription_status')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'athlete') {
        router.push('/login')
        return
      }

      // Check subscription status
      if (profile.subscription_status !== 'active') {
        router.push('/athlete/payment-required')
        return
      }

      setAuthorized(true)
      setChecking(false)
    }

    checkAccess()
  }, [supabase, router, pathname, isPaymentPage])

  if (isPaymentPage) {
    return <>{children}</>
  }

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
