import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/send-push'

const STAFF_ROLES = new Set(['coach', 'admin', 'super_admin'])

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messageId } = await req.json()
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [{ data: actor }, { data: message, error: messageError }] = await Promise.all([
      service.from('profiles').select('role').eq('id', user.id).single(),
      service.from('chat_messages').select('id, sender_id, receiver_id, athlete_id').eq('id', messageId).single(),
    ])

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const isSender = message.sender_id === user.id
    const isStaffActor = Boolean(actor?.role && STAFF_ROLES.has(actor.role))
    if (!isSender && !isStaffActor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!message.receiver_id || !message.athlete_id) {
      return NextResponse.json({ success: true, notified: false, reason: 'not_an_athlete_message' })
    }

    const notified = await sendPushToUser(message.receiver_id, {
      title: 'New message from your coach',
      body: 'You have a new message in Fuel Different.',
      tag: `coach-message-${message.athlete_id}`,
      url: '/athlete/dashboard',
    })

    return NextResponse.json({ success: true, notified })
  } catch (error) {
    console.error('[CHAT NOTIFY ATHLETE] Error:', error)
    return NextResponse.json({ error: 'Unable to send notification' }, { status: 500 })
  }
}
