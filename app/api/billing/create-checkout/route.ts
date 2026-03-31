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

    const { teamId, athleteCount, coachId, coachEmail } = await req.json()

    if (!teamId || !athleteCount || !coachId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. Verify the logged-in user IS the coach (or an admin/super_admin)
    if (user.id !== coachId) {
      const { data: callerProfile } = await authSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
        return NextResponse.json({ error: 'Forbidden — you can only create checkout for your own team' }, { status: 403 })
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Verify the coach owns this team
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, name, coach_id')
      .eq('id', teamId)
      .single()

    if (!team || team.coach_id !== coachId) {
      return NextResponse.json({ error: 'Unauthorized — coach does not own this team' }, { status: 403 })
    }

    // Check if team already has a Stripe customer
    const { data: existingSub } = await supabaseAdmin
      .from('team_subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', teamId)
      .single()

    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: coachEmail,
        metadata: {
          team_id: teamId,
          coach_id: coachId,
          team_name: team.name,
        },
      })
      customerId = customer.id
    }

    // Create checkout session with per-athlete pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Fuel Different — ${team.name}`,
              description: `Monthly nutrition tracking for ${athleteCount} athletes`,
            },
            unit_amount: 2000, // $20.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: athleteCount,
        },
      ],
      subscription_data: {
        metadata: {
          team_id: teamId,
          coach_id: coachId,
          athlete_count: athleteCount.toString(),
        },
      },
      success_url: `${req.nextUrl.origin}/coach/billing?success=true&team=${teamId}`,
      cancel_url: `${req.nextUrl.origin}/coach/billing?canceled=true`,
      metadata: {
        team_id: teamId,
        coach_id: coachId,
      },
    })

    return NextResponse.json({ url: session.url, customerId })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
