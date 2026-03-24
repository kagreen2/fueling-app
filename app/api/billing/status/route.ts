import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
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

    if (teamId) {
      // Coach checking their team's subscription
      const { data: sub } = await supabaseAdmin
        .from('team_subscriptions')
        .select('*')
        .eq('team_id', teamId)
        .single()

      return NextResponse.json({ subscription: sub || null })
    }

    if (athleteId) {
      // Check if athlete's team has an active subscription
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

    return NextResponse.json({ error: 'teamId or athleteId required' }, { status: 400 })
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
