'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

declare global {
  interface Window {
    turnstile: any
  }
}

export default function LoginPage( ) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  // Load Turnstile script and render widget
  useEffect(() => {
    const scriptId = 'cf-turnstile-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = ( ) => renderWidget()
      document.head.appendChild(script)
    } else if (window.turnstile) {
      renderWidget()
    }
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  function renderWidget() {
    if (turnstileRef.current && window.turnstile && !widgetIdRef.current) {
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: '0x4AAAAAACv1P_wt965vngGf',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        theme: 'dark',
      })
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      // Reset turnstile
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
        setCaptchaToken('')
      }
      return
    }

    // Route based on role AND subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'athlete') {
      if (profile.subscription_status === 'active') {
        router.push('/athlete')
      } else {
        router.push('/athlete/payment-required')
      }
    } else if (profile?.role === 'parent') {
      router.push('/parent')
    } else if (profile?.role === 'coach') {
      router.push('/coach')
    } else if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      router.push('/admin')
    } else {
      router.push('/athlete')
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (error) {
      setResetError(error.message)
      setResetLoading(false)
      return
    }

    setResetSent(true)
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
            <div className="text-4xl">⚡</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="text-slate-400">
            {showForgotPassword
              ? 'Enter your email and we\'ll send you a reset link'
              : 'Sign in to your Fuel Different account'}
          </p>
        </div>

        {showForgotPassword ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur">
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">Check Your Email</h3>
                <p className="text-slate-400 text-sm">
                  We sent a password reset link to <strong className="text-white">{resetEmail}</strong>.
                  Click the link in the email to reset your password.
                </p>
                <p className="text-slate-500 text-xs">
                  Didn&apos;t receive it? Check your spam folder or try again.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => { setResetSent(false); setResetEmail('') }}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                  >
                    Try a different email
                  </button>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); setResetError('') }}
                    className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">Email Address</label>
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
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold py-3 rounded-xl text-lg transition-colors mt-2"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetError('') }}
                  className="text-slate-400 hover:text-slate-300 text-sm transition-colors text-center mt-1"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur">
              
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

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError('') }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Turnstile CAPTCHA widget */}
              <div ref={turnstileRef} className="flex justify-center" />

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
        </div>
      </div>
    </main>
  )
}
