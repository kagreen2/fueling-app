'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/coach/dashboard')
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading coach dashboard...</p>
      </div>
    </main>
  )
}
