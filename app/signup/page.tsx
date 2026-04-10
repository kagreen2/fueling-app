'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOrganization, useOrgStyles } from '@/lib/organizations'
import OrgBrand from '@/components/OrgBrand'

export default function SignupPage( ) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { org } = useOrganization()
  const styles = useOrgStyles()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    role: 'athlete' as 'athlete' | 'member' | 'coach',
  })

  // Pre-fill invite code and email from URL params (e.g., from coach invite or QR code scan)
  useEffect(() => {
    const invite = searchParams.get('invite')
    const email = searchParams.get('email')
    if (invite || email) {
      setForm(prev => ({
        ...prev,
        ...(invite ? { inviteCode: invite.toUpperCase(), role: 'athlete' as const } : {}),
        ...(email ? { email: email.toLowerCase() } : {}),
      }))
    }
  }, [searchParams])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isAthleteOrMember = form.role === 'athlete' || form.role === 'member'

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

    if (!form.fullName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Mirror session to localStorage for PWA homescreen persistence
        if (data.session) {
          try {
            window.localStorage.setItem('fuel-different-auth', JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }))
          } catch {}
        }

        // Wait for profile to be created by trigger
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

        // For both athlete and member roles, store as 'athlete' in profiles
        // The user_type distinction is stored in the athletes table during onboarding
        const profileRole = form.role === 'coach' ? 'coach' : 'athlete'

        if (!profileExists) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: form.fullName,
            email: form.email,
            role: profileRole,
            subscription_status: isAthleteOrMember ? 'unpaid' : null,
          })
        } else {
          await supabase.from('profiles').update({
            role: profileRole,
            full_name: form.fullName,
            subscription_status: isAthleteOrMember ? 'unpaid' : null,
          }).eq('id', data.user.id)
        }

        if (form.role === 'coach') {
          router.push('/coach/dashboard')
        } else {
          if (form.inviteCode.trim()) {
            localStorage.setItem('fuel_invite_code', form.inviteCode.trim().toUpperCase())
          }

          // Store user type selection so onboarding can pre-fill it
          localStorage.setItem('fuel_user_type', form.role)

          const res = await fetch('/api/billing/athlete-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: form.email,
              fullName: form.fullName,
            }),
          })

          const checkout = await res.json()

          if (checkout.url) {
            window.location.href = checkout.url
          } else {
            setError(checkout.error || 'Failed to create checkout session. Please try again.')
            setLoading(false)
          }
          return
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: styles.colors.primary + '18' }} />
        <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: styles.colors.primary + '18' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <OrgBrand size="lg" showName={false} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Join {org.name}</h1>
          <p className="text-slate-400">Performance fueling for serious athletes &amp; fitness enthusiasts</p>
        </div>

        {/* Role selection — 3 options */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, role: 'athlete' }))}
            className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 text-center ${
              form.role === 'athlete'
                ? 'border-2 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
            }`}
            style={form.role === 'athlete' ? { borderColor: styles.colors.primary, backgroundColor: styles.colors.primary + '18' } : undefined}
          >
            <div className="text-2xl mb-1">🏈</div>
            <div className="font-semibold text-sm">Athlete</div>
            <div className="text-xs text-slate-500 mt-0.5">Sport-specific nutrition</div>
          </button>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, role: 'member' }))}
            className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 text-center ${
              form.role === 'member'
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
            }`}
          >
            <div className="text-2xl mb-1">💪</div>
            <div className="font-semibold text-sm">General Fitness</div>
            <div className="text-xs text-slate-500 mt-0.5">Personalized coaching</div>
          </button>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, role: 'coach', inviteCode: '' }))}
            className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 text-center ${
              form.role === 'coach'
                ? 'border-2 text-white'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
            }`}
            style={form.role === 'coach' ? { borderColor: styles.colors.primary, backgroundColor: styles.colors.primary + '18' } : undefined}
          >
            <div className="text-2xl mb-1">📋</div>
            <div className="font-semibold text-sm">Coach</div>
            <div className="text-xs text-slate-500 mt-0.5">Monitor your team</div>
          </button>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 backdrop-blur">
          
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

          {isAthleteOrMember && (
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Team Invite Code <span className="text-slate-500">(from your coach)</span>
              </label>
              <Input
                type="text"
                value={form.inviteCode}
                onChange={e => update('inviteCode', e.target.value.toUpperCase())}
                placeholder="e.g. RLXCZM"
                className="uppercase tracking-widest font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Don&apos;t have one? You can add it later during setup.
              </p>
            </div>
          )}

          {form.role === 'coach' && (
            <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: styles.colors.primary + '0d', borderColor: styles.colors.primary + '33' }}>
              <p className="text-sm" style={{ color: styles.colors.primary + 'cc' }}>
                After signing up, you&apos;ll create your team and get an invite code to share with your athletes and members.
              </p>
            </div>
          )}

          {isAthleteOrMember && (
            <div className="border rounded-xl px-4 py-3" style={{ backgroundColor: (form.role === 'member' ? '#3B82F6' : styles.colors.primary) + '0d', borderColor: (form.role === 'member' ? '#3B82F6' : styles.colors.primary) + '33' }}>
              <p className="text-sm" style={{ color: (form.role === 'member' ? '#93C5FD' : styles.colors.primary) + 'cc' }}>
                After creating your account, you&apos;ll be directed to complete payment ($20/month). Have a promo code? You can enter it at checkout.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={form.role === 'member' ? { backgroundColor: '#3B82F6' } : styles.primaryButton}
            className="w-full font-semibold py-3 rounded-xl text-lg transition-colors mt-2 text-white disabled:opacity-50"
          >
            {loading
              ? (isAthleteOrMember ? 'Creating account & preparing checkout...' : 'Creating account...')
              : form.role === 'coach'
              ? 'Create Coach Account'
              : 'Create Account & Continue to Payment'}
          </Button>

          <label className="flex items-start gap-3 mt-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 cursor-pointer"
              style={{ accentColor: styles.colors.primary }}
            />
            <span className="text-xs text-slate-400 leading-relaxed">
              I agree to the{' '}
              <a href="/terms" target="_blank" style={styles.primaryText} className="hover:opacity-80 underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" style={styles.primaryText} className="hover:opacity-80 underline">Privacy Policy</a>
            </span>
          </label>

        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" style={styles.primaryText} className="hover:opacity-80 font-medium transition">
              Sign in
            </Link>
          </p>
          <Link href="/" className="text-slate-500 text-sm hover:text-slate-400 transition block">
            Back to home
          </Link>
          <a
            href={`mailto:${org.contact_email || 'kelly@crossfitironflag.com'}?subject=${org.name} — Signup Help`}
            className="text-slate-500 text-sm hover:text-slate-400 transition block mt-2"
          >
            Need help? Contact support
          </a>
        </div>
      </div>
    </main>
  )
}
