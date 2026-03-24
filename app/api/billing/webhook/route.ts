import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const supabaseAdmin = getSupabaseAdmin()

  let event: Stripe.Event

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } else {
      // For development/testing without webhook signing
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const teamId = session.metadata?.team_id
        const coachId = session.metadata?.coach_id

        if (teamId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any
          const athleteCount = parseInt(subscription.metadata?.athlete_count || '0')

          await supabaseAdmin.from('team_subscriptions').upsert({
            team_id: teamId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: 'active',
            athlete_count: athleteCount,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            amount_per_athlete: 2000,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'team_id' })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const teamId = subscription.metadata?.team_id

        if (teamId) {
          const status = subscription.status === 'active' || subscription.status === 'trialing'
            ? 'active'
            : subscription.status === 'past_due'
            ? 'past_due'
            : 'canceled'

          await supabaseAdmin.from('team_subscriptions').update({
            status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('team_id', teamId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const teamId = subscription.metadata?.team_id

        if (teamId) {
          await supabaseAdmin.from('team_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('team_id', teamId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          await supabaseAdmin.from('team_subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', subscriptionId)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
