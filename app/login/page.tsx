'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    // Route based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'athlete') router.push('/athlete')
    else if (profile?.role === 'parent') router.push('/parent')
    else if (profile?.role === 'coach') router.push('/coach')
    else if (profile?.role === 'admin') router.push('/admin')
    else if (profile?.role === 'super_admin') router.push('/admin')
    else router.push('/athlete')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <div className="text-4xl">⚡</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your Fuel Different account</p>
        </div>

        {/* Form */}
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-semibold py-3 rounded-xl text-lg transition-colors mt-4"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

        </form>

        {/* Footer Links */}
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
