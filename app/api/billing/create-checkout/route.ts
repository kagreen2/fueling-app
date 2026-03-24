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
    const { teamId, athleteCount, coachId, coachEmail } = await req.json()

    if (!teamId || !athleteCount || !coachId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Verify the coach owns this team
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, name, coach_id')
      .eq('id', teamId)
      .single()

    if (!team || team.coach_id !== coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
