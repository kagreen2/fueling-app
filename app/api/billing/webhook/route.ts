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
            amount_per_athlete: 2500,
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

          // Send cancellation email notification to admin
          try {
            const { data: canceledProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name, email')
              .eq('id', userId)
              .single()

            const RESEND_API_KEY = process.env.RESEND_API_KEY
            const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kelly@crossfitironflag.com'

            if (RESEND_API_KEY && canceledProfile) {
              const athleteName = canceledProfile.full_name || canceledProfile.email || 'Unknown athlete'
              const athleteEmail = canceledProfile.email || 'N/A'
              const cancelDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Fuel Different <notifications@fueldifferent.app>',
                  to: ADMIN_EMAIL,
                  subject: `⚠️ Subscription Canceled — ${athleteName}`,
                  html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 32px; border: 1px solid #475569;">
        <h2 style="color: #f87171; margin: 0 0 16px 0; font-size: 20px;">⚠️ Subscription Canceled</h2>
        <p style="color: #cbd5e1; margin: 0 0 20px 0; font-size: 15px;">An athlete has canceled their subscription:</p>
        <table style="width: 100%; background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <tr><td style="color: #94a3b8; font-size: 13px; padding: 4px 0;">Name</td><td style="color: #ffffff; font-size: 14px; font-weight: 600; padding: 4px 0;">${athleteName}</td></tr>
          <tr><td style="color: #94a3b8; font-size: 13px; padding: 4px 0;">Email</td><td style="color: #ffffff; font-size: 14px; padding: 4px 0;">${athleteEmail}</td></tr>
          <tr><td style="color: #94a3b8; font-size: 13px; padding: 4px 0;">Canceled</td><td style="color: #f87171; font-size: 14px; padding: 4px 0;">${cancelDate}</td></tr>
        </table>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Their access has been revoked. They'll be redirected to the payment page if they try to log in.</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
                }),
              })
            }
          } catch (emailErr) {
            console.error('Failed to send cancellation email notification:', emailErr)
          }
        }

        // ---- TEAM ----
        if (teamId) {
          await supabaseAdmin.from('team_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('team_id', teamId)

          // Send team cancellation email notification to admin
          try {
            const { data: team } = await supabaseAdmin
              .from('teams')
              .select('name')
              .eq('id', teamId)
              .single()

            const RESEND_API_KEY = process.env.RESEND_API_KEY
            const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kelly@crossfitironflag.com'

            if (RESEND_API_KEY && team) {
              const cancelDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Fuel Different <notifications@fueldifferent.app>',
                  to: ADMIN_EMAIL,
                  subject: `⚠️ Team Subscription Canceled — ${team.name}`,
                  html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 32px; border: 1px solid #475569;">
        <h2 style="color: #f87171; margin: 0 0 16px 0; font-size: 20px;">⚠️ Team Subscription Canceled</h2>
        <p style="color: #cbd5e1; margin: 0 0 20px 0; font-size: 15px;">A team subscription has been canceled:</p>
        <table style="width: 100%; background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <tr><td style="color: #94a3b8; font-size: 13px; padding: 4px 0;">Team</td><td style="color: #ffffff; font-size: 14px; font-weight: 600; padding: 4px 0;">${team.name}</td></tr>
          <tr><td style="color: #94a3b8; font-size: 13px; padding: 4px 0;">Canceled</td><td style="color: #f87171; font-size: 14px; padding: 4px 0;">${cancelDate}</td></tr>
        </table>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">All athletes on this team will lose access until the subscription is renewed.</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
                }),
              })
            }
          } catch (emailErr) {
            console.error('Failed to send team cancellation email notification:', emailErr)
          }
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
