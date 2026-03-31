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
    // In production, ALWAYS require webhook signature verification.
    // The dev bypass is only allowed when NODE_ENV is explicitly 'development'.
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } else if (process.env.NODE_ENV === 'development') {
      // Local development only — accept unsigned events for testing
      console.warn('⚠️  Webhook signature verification skipped (development mode)')
      event = JSON.parse(body) as Stripe.Event
    } else {
      // Production without a webhook secret or signature — reject
      console.error('Missing STRIPE_WEBHOOK_SECRET or stripe-signature header in production')
      return NextResponse.json(
        { error: 'Webhook signature verification required. Set STRIPE_WEBHOOK_SECRET in production.' },
        { status: 400 }
      )
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const type = session.metadata?.type
        const teamId = session.metadata?.team_id
        const coachId = session.metadata?.coach_id

        // ---- INDIVIDUAL ATHLETE SUBSCRIPTION ----
        if (type === 'athlete_individual' && userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

          // Activate the athlete's account
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq('id', userId)
        }

        // ---- TEAM SUBSCRIPTION (existing coach flow) ----
        if (teamId && session.subscription) {
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
        const userId = subscription.metadata?.user_id
        const type = subscription.metadata?.type
        const teamId = subscription.metadata?.team_id

        // ---- INDIVIDUAL ATHLETE SUBSCRIPTION ----
        if (type === 'athlete_individual' && userId) {
          const status = subscription.status === 'active' || subscription.status === 'trialing'
            ? 'active'
            : subscription.status === 'past_due'
            ? 'past_due'
            : 'canceled'

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: status,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId)
        }

        // ---- TEAM SUBSCRIPTION ----
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
        const userId = subscription.metadata?.user_id
        const type = subscription.metadata?.type
        const teamId = subscription.metadata?.team_id

        // ---- INDIVIDUAL ATHLETE ----
        if (type === 'athlete_individual' && userId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'canceled',
            })
            .eq('id', userId)
        }

        // ---- TEAM ----
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
          // Try to find if this is an individual athlete subscription
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({ subscription_status: 'past_due' })
              .eq('id', profile.id)
          }

          // Also check team subscriptions
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
