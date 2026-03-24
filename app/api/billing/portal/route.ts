import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { teamId, coachId } = await req.json()
    const supabaseAdmin = getSupabaseAdmin()

    // Get the team's Stripe customer ID
    const { data: sub } = await supabaseAdmin
      .from('team_subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', teamId)
      .single()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/coach/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
