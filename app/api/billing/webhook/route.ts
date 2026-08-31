import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const FUEL42_PACKAGES: Record<string, { key: string; name: string; amountCents: number }> = {
  plink_1U95KyFd19nnAKLW98iJQEQE: { key: 'member', name: 'FUEL 42 — Member Challenge Access', amountCents: 13900 },
  plink_1U95V1Fd19nnAKLWA31wOB5w: { key: 'classes', name: 'FUEL 42 — Nutrition + Unlimited Classes', amountCents: 24900 },
  plink_1U95YyFd19nnAKLWbhZhhz4a: { key: 'pt6', name: 'FUEL 42 — Nutrition + 6 Personal Training Sessions', amountCents: 49900 },
  plink_1U95fZFd19nnAKLWLqkl0EUg: { key: 'pt12', name: 'FUEL 42 — Nutrition + 12 Personal Training Sessions', amountCents: 79900 },
}

function getFuel42Package(session: Stripe.Checkout.Session) {
  const paymentLink = session.payment_link
  const paymentLinkId = typeof paymentLink === 'string' ? paymentLink : paymentLink?.id
  return paymentLinkId ? { paymentLinkId, package: FUEL42_PACKAGES[paymentLinkId] } : null
}

function isCompletedFuel42Checkout(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid'
    || (session.payment_status === 'no_payment_required' && session.amount_total === 0)
}

async function notifyGymneticsFuel42Purchase({
  email,
  fullName,
  phone,
  packageName,
  packageKey,
  amountCents,
  checkoutSessionId,
}: {
  email: string
  fullName: string | null
  phone: string | null
  packageName: string
  packageKey: string
  amountCents: number
  checkoutSessionId: string
}) {
  const workflowWebhookUrl = process.env.FUEL42_GYMNETICS_WEBHOOK_URL
  if (!workflowWebhookUrl) return false

  try {
    const response = await fetch(workflowWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'stripe_fuel42_payment_link',
        email,
        full_name: fullName,
        phone,
        package_name: packageName,
        package_key: packageKey,
        amount_cents: amountCents,
        checkout_session_id: checkoutSessionId,
        booking_url: process.env.FUEL42_BOOKING_URL || 'https://link.gymntx.com/widget/bookings/fuel42-challenge',
      }),
    })
    return response.ok
  } catch (error) {
    console.error('Unable to send FUEL 42 purchase to Gymnetics:', error)
    return false
  }
}

async function sendFuel42BookingEmail({ email, firstName, packageName }: { email: string; firstName: string; packageName: string }) {
  const bookingUrl = process.env.FUEL42_BOOKING_URL || 'https://link.gymntx.com/widget/bookings/fuel42-challenge'
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Fuel Different <notifications@fueldifferent.app>',
      to: email,
      subject: 'You’re registered for FUEL 42 — book your InBody consultation',
      html: `<div style="background:#0a0e1a;padding:36px 18px;font-family:Arial,Helvetica,sans-serif;color:#f7f9ff"><div style="max-width:600px;margin:0 auto;background:#11182a;border:1px solid #263550;padding:34px"><p style="margin:0 0 16px;color:#4ade80;font-size:12px;letter-spacing:2px;font-weight:800">IRON FLAG FITNESS · FUEL 42</p><h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;color:#ffffff">You’re in for FUEL 42.</h1><p style="color:#c7d0e0;font-size:16px;line-height:1.6">Hi ${firstName},</p><p style="color:#c7d0e0;font-size:16px;line-height:1.6">Your ${packageName} purchase is confirmed. The next step is to book your initial InBody consultation for September 13, 14, or 15. During that appointment, we’ll set up Fuel Different together and make sure you are ready for the 42-day challenge beginning September 14.</p><p style="margin:28px 0"><a href="${bookingUrl}" style="display:inline-block;background:#4ade80;color:#08110c;text-decoration:none;font-weight:800;padding:15px 22px">BOOK YOUR INBODY CONSULTATION</a></p><p style="color:#9eabc0;font-size:14px;line-height:1.6">Questions? Contact hello@fueldifferent.app.</p></div></div>`,
    }),
  })
  return response.ok
}

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

        // ---- FUEL 42 ONE-TIME CHALLENGE PURCHASE ----
        // Payment Links do not have an app user yet. Record the purchaser now; staff sends the
        // one-time setup link at the InBody consultation, which grants access through October 31.
        const fuel42 = getFuel42Package(session)
        if (fuel42?.package && isCompletedFuel42Checkout(session)) {
          try {
            const email = session.customer_details?.email?.trim().toLowerCase()
            if (!email) throw new Error('FUEL 42 checkout did not provide a customer email')

            const fullName = session.customer_details?.name || null
            const { data: existingEnrollment } = await supabaseAdmin
              .from('fuel42_enrollments')
              .select('id')
              .eq('stripe_checkout_session_id', session.id)
              .maybeSingle()

            const { error: enrollmentError } = await supabaseAdmin
              .from('fuel42_enrollments')
              .upsert({
                stripe_checkout_session_id: session.id,
                stripe_payment_link_id: fuel42.paymentLinkId,
                stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
                full_name: fullName,
                email,
                phone: session.customer_details?.phone || null,
                package_key: fuel42.package.key,
                package_name: fuel42.package.name,
                amount_cents: session.amount_total || fuel42.package.amountCents,
                currency: session.currency || 'usd',
                payment_status: 'paid',
                status: 'purchased',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'stripe_checkout_session_id' })
            if (enrollmentError) throw enrollmentError

            if (!existingEnrollment) {
              const gymneticsNotified = await notifyGymneticsFuel42Purchase({
                email,
                fullName,
                phone: session.customer_details?.phone || null,
                packageName: fuel42.package.name,
                packageKey: fuel42.package.key,
                amountCents: session.amount_total || 0,
                checkoutSessionId: session.id,
              })
              const sent = gymneticsNotified || await sendFuel42BookingEmail({
                email,
                firstName: fullName?.split(' ')[0] || 'there',
                packageName: fuel42.package.name,
              })
              if (sent) {
                await supabaseAdmin
                  .from('fuel42_enrollments')
                  .update({ first_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                  .eq('stripe_checkout_session_id', session.id)
              }
            }
          } catch (fuel42Error) {
            // Do not interrupt existing subscription processing; Stripe retries can be handled safely by the unique checkout-session key.
            console.error('Unable to record FUEL 42 enrollment:', fuel42Error)
          }
        }

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
