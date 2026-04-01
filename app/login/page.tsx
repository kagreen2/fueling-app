'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import LightningBolt from '@/components/ui/LightningBolt'

export default function LoginPage( ) {
  const router = useRouter()
  const supabase = createClient()

  // Listen for auth state changes and mirror session to localStorage for PWA persistence
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        try {
          window.localStorage.setItem('fuel-different-auth', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }))
        } catch {}
      } else if (event === 'SIGNED_OUT') {
        window.localStorage.removeItem('fuel-different-auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Mirror session to localStorage for PWA homescreen persistence
    if (data.session) {
      try {
        window.localStorage.setItem("fuel-different-auth", JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }))
      } catch {}
    }

    // Route based on role AND subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      setError('Unable to load your profile. Please try again or contact support.')
      setLoading(false)
      return
    }

    if (profile.role === 'coach') {
      router.push('/coach/dashboard')
    } else if (profile.role === 'admin' || profile.role === 'super_admin') {
      router.push('/admin')
    } else {
      // Athlete — check subscription status
      if (profile.subscription_status !== 'active') {
        router.push('/athlete/payment-required')
      } else {
        router.push('/athlete/dashboard')
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setResetError(error.message)
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <LightningBolt className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your Fuel Different account</p>
        </div>

        {showForgotPassword ? (
          <>
            {resetSent ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-slate-400 text-sm mb-6">
                  We sent a password reset link to <span className="text-white font-medium">{resetEmail}</span>
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError('') }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-slate-400 text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </div>

                  {resetError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                      {resetError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold py-3 rounded-xl text-lg transition-colors"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetError('') }}
                    className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
                  >
                    Back to sign in
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 backdrop-blur">

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError('') }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold py-3 rounded-xl text-lg transition-colors mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

            </form>
          </>
        )}

        <div className="mt-8 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            New athlete?{' '}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Create account
            </Link>
          </p>
          <Link href="/" className="text-slate-500 text-sm hover:text-slate-400 transition block">
            Back to home
          </Link>
          <a
            href="mailto:kelly@crossfitironflag.com?subject=Fuel Different — Login Help"
            className="text-slate-500 text-sm hover:text-slate-400 transition block mt-2"
          >
            Need help? Contact support
          </a>
        </div>
      </div>
    </main>
  )
}
