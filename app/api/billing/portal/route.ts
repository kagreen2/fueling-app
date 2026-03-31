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

    const { teamId, coachId, userId } = await req.json()
    const supabaseAdmin = getSupabaseAdmin()

    let customerId: string | null = null
    let returnUrl: string

    // Individual athlete portal
    if (userId) {
      // 2a. Verify the logged-in user matches the userId (or is admin)
      if (user.id !== userId) {
        const { data: callerProfile } = await authSupabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
          return NextResponse.json({ error: 'Forbidden — you can only access your own billing portal' }, { status: 403 })
        }
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      customerId = profile?.stripe_customer_id || null
      returnUrl = `${req.nextUrl.origin}/athlete/profile`
    }
    // Team/coach portal
    else if (teamId) {
      // 2b. Verify the logged-in user is the team's coach (or is admin)
      const { data: team } = await supabaseAdmin
        .from('teams')
        .select('coach_id')
        .eq('id', teamId)
        .single()

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      if (user.id !== team.coach_id) {
        const { data: callerProfile } = await authSupabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
          return NextResponse.json({ error: 'Forbidden — you can only access billing for your own team' }, { status: 403 })
        }
      }

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
