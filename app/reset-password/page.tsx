'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase automatically handles the token exchange from the URL hash
    // We just need to wait for the session to be established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
      }
    })

    // Also check if session already exists (in case event fired before listener attached)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg viewBox="0 0 100 160" className="w-8 h-12">
              <polygon points="58,0 10,90 45,90 42,160 90,65 55,65" fill="#4ade80" />
            </svg>
            <h1 className="text-2xl font-bold text-white tracking-tight">FUEL DIFFERENT</h1>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Updated!</h2>
              <p className="text-slate-400 text-sm">Your password has been successfully reset. Redirecting to login...</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-white mb-2">Verifying Reset Link</h2>
              <p className="text-slate-400 text-sm">Please wait while we verify your reset link...</p>
              <p className="text-slate-500 text-xs mt-4">If this takes more than 10 seconds, your link may have expired. Please request a new one from the login page.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Set New Password</h2>
              <p className="text-slate-400 text-sm mb-6 text-center">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
