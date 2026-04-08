import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser, sendPushToRole } from '@/lib/notifications/send-push'

/**
 * POST /api/notifications/push-event
 * 
 * Triggers push notifications for specific events:
 * - "new_signup" → notifies all admins
 * - "team_join" → notifies the team's coach
 */
export async function POST(req: NextRequest) {
  try {
    const { event, data } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (event === 'new_signup') {
      // data: { athleteName, email, sport?, school? }
      const name = data?.athleteName || data?.email || 'A new user'
      const details = [data?.sport, data?.school].filter(Boolean).join(' · ')
      const body = details
        ? `${name} just signed up (${details})`
        : `${name} just signed up`

      const notified = await sendPushToRole('admin', {
        title: '🆕 New User Signed Up',
        body,
        tag: 'new-signup',
        url: '/admin',
      })

      // Also notify super_admin role if separate
      const notifiedSuper = await sendPushToRole('super_admin', {
        title: '🆕 New User Signed Up',
        body,
        tag: 'new-signup',
        url: '/admin',
      })

      return NextResponse.json({ success: true, notified: notified + notifiedSuper })
    }

    if (event === 'team_join') {
      // data: { athleteName, teamId, teamName? }
      const athleteName = data?.athleteName || 'An athlete'

      // Look up the team to find the coach
      const { data: team } = await supabase
        .from('teams')
        .select('id, name, coach_id')
        .eq('id', data?.teamId)
        .single()

      if (!team || !team.coach_id) {
        return NextResponse.json({ success: true, notified: 0, reason: 'no_coach_found' })
      }

      // Get the coach's user_id from the coaches table
      const { data: coach } = await supabase
        .from('coaches')
        .select('user_id')
        .eq('id', team.coach_id)
        .single()

      if (!coach?.user_id) {
        return NextResponse.json({ success: true, notified: 0, reason: 'coach_no_user_id' })
      }

      const teamName = team.name || data?.teamName || 'your team'
      const sent = await sendPushToUser(coach.user_id, {
        title: '👋 New Athlete Joined',
        body: `${athleteName} just joined ${teamName}`,
        tag: 'team-join',
        url: '/coach/dashboard',
      })

      // Also notify admins about team joins
      await sendPushToRole('admin', {
        title: '👋 Athlete Joined Team',
        body: `${athleteName} joined ${teamName}`,
        tag: 'team-join-admin',
        url: '/admin',
      })

      return NextResponse.json({ success: true, notified: sent ? 1 : 0 })
    }

    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
  } catch (err: any) {
    console.error('Push event error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
