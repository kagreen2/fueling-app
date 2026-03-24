import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin( ) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const teamId = req.nextUrl.searchParams.get('teamId')
    const athleteId = req.nextUrl.searchParams.get('athleteId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (teamId) {
      // Coach checking their team's subscription
      const { data: sub } = await supabaseAdmin
        .from('team_subscriptions')
        .select('*')
        .eq('team_id', teamId)
        .single()

      return NextResponse.json({ subscription: sub || null })
    }

    // Check individual user subscription status
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, stripe_subscription_id')
        .eq('id', userId)
        .single()

      if (profile?.subscription_status === 'active') {
        return NextResponse.json({ hasAccess: true, reason: 'individual_subscription' })
      }

      return NextResponse.json({
        hasAccess: false,
        reason: profile?.subscription_status === 'past_due' ? 'past_due' : 'no_subscription',
        status: profile?.subscription_status || 'unpaid',
      })
    }

    if (athleteId) {
      // First check if the athlete's profile has an individual subscription
      // Look up the profile_id from the athletes table
      const { data: athlete } = await supabaseAdmin
        .from('athletes')
        .select('profile_id')
        .eq('id', athleteId)
        .single()

      if (athlete) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_status')
          .eq('id', athlete.profile_id)
          .single()

        if (profile?.subscription_status === 'active') {
          return NextResponse.json({ hasAccess: true, reason: 'individual_subscription' })
        }
      }

      // Then check if athlete's team has an active subscription (coach-paid)
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('team_id')
        .eq('athlete_id', athleteId)

      if (!membership || membership.length === 0) {
        return NextResponse.json({ hasAccess: false, reason: 'not_on_team' })
      }

      const teamIds = membership.map(m => m.team_id)
      const { data: subs } = await supabaseAdmin
        .from('team_subscriptions')
        .select('status')
        .in('team_id', teamIds)
        .eq('status', 'active')

      const hasAccess = subs && subs.length > 0
      return NextResponse.json({ hasAccess, reason: hasAccess ? 'active_subscription' : 'no_active_subscription' })
    }

    return NextResponse.json({ error: 'teamId, athleteId, or userId required' }, { status: 400 })
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
