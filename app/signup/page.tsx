'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

  const inputClass = "w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">Create account</h1>
          <p className="text-zinc-400">Start fueling for performance</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Full name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={e => update('fullName', e.target.value)}
              required
              placeholder="First Last"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required
              placeholder="Min 8 characters"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Confirm password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              required
              placeholder="Confirm your password"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">
              Invite code <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="text"
              value={form.inviteCode}
              onChange={e => update('inviteCode', e.target.value)}
              placeholder="Enter code if you have one"
              className={inputClass + ' uppercase tracking-widest'}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold py-4 rounded-xl text-lg transition-colors mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-400">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-zinc-600 text-sm hover:text-zinc-400">
            Back
          </Link>
        </div>

      </div>
    </main>
  )
}