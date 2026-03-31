import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller via session cookie
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 })
    }

    const { userId, email, fullName } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. Verify the logged-in user matches the userId being charged
    //    (admins/super_admins can also initiate checkout on behalf of an athlete)
    if (user.id !== userId) {
      const { data: callerProfile } = await authSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
        return NextResponse.json({ error: 'Forbidden — you can only create a checkout for your own account' }, { status: 403 })
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', userId)
      .single()

    // If already active, no need to checkout
    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email,
        name: fullName || undefined,
        metadata: {
          user_id: userId,
          type: 'athlete',
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create checkout session for individual athlete subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Fuel Different — Athlete Monthly',
              description: 'Personalized nutrition tracking & AI meal analysis',
            },
            unit_amount: 2000, // $20.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: userId,
          type: 'athlete_individual',
        },
      },
      success_url: `${req.nextUrl.origin}/athlete/onboarding?payment=success`,
      cancel_url: `${req.nextUrl.origin}/athlete/payment-required?canceled=true`,
      metadata: {
        user_id: userId,
        type: 'athlete_individual',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Athlete checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
