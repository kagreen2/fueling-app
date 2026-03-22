'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      let profileExists = false
      let attempts = 0

      while (!profileExists && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()
        if (profile) profileExists = true
        attempts++
      }

      if (!profileExists) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: form.fullName,
          email: form.email,
          role: 'athlete',
        })
      }

      router.push('/athlete/onboarding')
    }

    setLoading(false)
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
          <h1 className="text-4xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400">Join Fuel Different and start optimizing your performance</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur">
          
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Full Name</label>
            <Input
              type="text"
              value={form.fullName}
              onChange={e => update('fullName', e.target.value)}
              required
              placeholder="First Last"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">Confirm Password</label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Invite Code <span className="text-slate-500">(optional)</span>
            </label>
            <Input
              type="text"
              value={form.inviteCode}
              onChange={e => update('inviteCode', e.target.value)}
              placeholder="Enter code if you have one"
              className="uppercase tracking-widest"
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
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Sign in
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
