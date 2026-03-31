import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  checks: {
    name: string
    status: 'pass' | 'fail'
    latency_ms: number
    message?: string
  }[]
}

export async function GET() {
  const checks: HealthCheck['checks'] = []
  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'

  // 1. Check Supabase Database Connection
  try {
    const start = Date.now()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    const latency = Date.now() - start

    if (error) {
      checks.push({ name: 'database', status: 'fail', latency_ms: latency, message: error.message })
      overallStatus = 'degraded'
    } else {
      checks.push({ name: 'database', status: 'pass', latency_ms: latency })
    }
  } catch (err: any) {
    checks.push({ name: 'database', status: 'fail', latency_ms: 0, message: err.message })
    overallStatus = 'down'
  }

  // 2. Check Supabase Auth Service
  try {
    const start = Date.now()
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
    const latency = Date.now() - start

    if (res.ok) {
      checks.push({ name: 'auth_service', status: 'pass', latency_ms: latency })
    } else {
      checks.push({ name: 'auth_service', status: 'fail', latency_ms: latency, message: `HTTP ${res.status}` })
      overallStatus = 'degraded'
    }
  } catch (err: any) {
    checks.push({ name: 'auth_service', status: 'fail', latency_ms: 0, message: err.message })
    overallStatus = 'degraded'
  }

  // 3. Check Stripe API
  try {
    const start = Date.now()
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      checks.push({ name: 'stripe', status: 'fail', latency_ms: 0, message: 'STRIPE_SECRET_KEY not configured' })
      overallStatus = 'degraded'
    } else {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      })
      const latency = Date.now() - start

      if (res.ok) {
        checks.push({ name: 'stripe', status: 'pass', latency_ms: latency })
      } else {
        checks.push({ name: 'stripe', status: 'fail', latency_ms: latency, message: `HTTP ${res.status}` })
        overallStatus = 'degraded'
      }
    }
  } catch (err: any) {
    checks.push({ name: 'stripe', status: 'fail', latency_ms: 0, message: err.message })
    overallStatus = 'degraded'
  }

  // 4. Check Resend (email service)
  try {
    const start = Date.now()
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      checks.push({ name: 'email_service', status: 'fail', latency_ms: 0, message: 'RESEND_API_KEY not configured' })
      overallStatus = 'degraded'
    } else {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${resendKey}` },
      })
      const latency = Date.now() - start

      if (res.ok) {
        checks.push({ name: 'email_service', status: 'pass', latency_ms: latency })
      } else {
        checks.push({ name: 'email_service', status: 'fail', latency_ms: latency, message: `HTTP ${res.status}` })
        overallStatus = 'degraded'
      }
    }
  } catch (err: any) {
    checks.push({ name: 'email_service', status: 'fail', latency_ms: 0, message: err.message })
    overallStatus = 'degraded'
  }

  // If all checks fail, mark as down
  const failCount = checks.filter(c => c.status === 'fail').length
  if (failCount === checks.length) overallStatus = 'down'

  const result: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(result, { status: httpStatus })
}
