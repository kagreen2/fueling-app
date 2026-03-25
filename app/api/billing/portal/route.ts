import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin( ) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { teamId, coachId, userId } = await req.json()
    const supabaseAdmin = getSupabaseAdmin()

    let customerId: string | null = null
    let returnUrl: string

    // Individual athlete portal
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      customerId = profile?.stripe_customer_id || null
      returnUrl = `${req.nextUrl.origin}/athlete/profile`
    }
    // Team/coach portal (existing flow)
    else if (teamId) {
      const { data: sub } = await supabaseAdmin
        .from('team_subscriptions')
        .select('stripe_customer_id')
        .eq('team_id', teamId)
        .single()

      customerId = sub?.stripe_customer_id || null
      returnUrl = `${req.nextUrl.origin}/coach/billing`
    } else {
      return NextResponse.json({ error: 'userId or teamId required' }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl!,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
