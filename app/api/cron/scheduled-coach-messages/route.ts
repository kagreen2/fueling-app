import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/send-push'

type DueDelivery = {
  delivery_id: string
  scheduled_message_id: string
  athlete_id: string
  recipient_profile_id: string
  coach_id: string
  message: string
  occurrence_at: string
  attempt_count: number
}

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) return false
  return request.headers.get('authorization') === `Bearer ${configuredSecret}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: claimedRows, error: claimError } = await service
      .rpc('claim_due_scheduled_coach_message_deliveries', { p_limit: 100 })

    if (claimError) {
      console.error('[SCHEDULED COACH MESSAGES] Claim failed', claimError)
      return NextResponse.json({ error: 'Unable to claim scheduled messages' }, { status: 500 })
    }

    const deliveries = (claimedRows || []) as DueDelivery[]
    let sent = 0
    let retried = 0
    let pushNotified = 0
    let failed = 0

    for (const delivery of deliveries) {
      const nextAttempt = delivery.attempt_count + 1
      let chatMessageId: string | null = null

      const { data: insertedMessage, error: insertError } = await service
        .from('chat_messages')
        .insert({
          sender_id: delivery.coach_id,
          receiver_id: delivery.recipient_profile_id,
          athlete_id: delivery.athlete_id,
          message: delivery.message,
          read: false,
          scheduled_delivery_id: delivery.delivery_id,
        })
        .select('id')
        .single()

      if (insertError && insertError.code !== '23505') {
        failed++
        await service
          .from('scheduled_coach_message_deliveries')
          .update({ attempt_count: nextAttempt, last_error: insertError.message })
          .eq('id', delivery.delivery_id)
        console.error('[SCHEDULED COACH MESSAGES] Chat insert failed', delivery.delivery_id, insertError)
        continue
      }

      if (insertedMessage?.id) {
        chatMessageId = insertedMessage.id
      } else {
        const { data: existingMessage, error: existingMessageError } = await service
          .from('chat_messages')
          .select('id')
          .eq('scheduled_delivery_id', delivery.delivery_id)
          .single()

        if (existingMessageError || !existingMessage?.id) {
          failed++
          await service
            .from('scheduled_coach_message_deliveries')
            .update({
              attempt_count: nextAttempt,
              last_error: existingMessageError?.message || 'Existing scheduled chat message was not found.',
            })
            .eq('id', delivery.delivery_id)
          continue
        }
        chatMessageId = existingMessage.id
        retried++
      }

      const { error: deliveryUpdateError } = await service
        .from('scheduled_coach_message_deliveries')
        .update({
          status: 'sent',
          attempt_count: nextAttempt,
          last_error: null,
          chat_message_id: chatMessageId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', delivery.delivery_id)

      if (deliveryUpdateError) {
        console.error('[SCHEDULED COACH MESSAGES] Delivery record update failed', delivery.delivery_id, deliveryUpdateError)
      }

      sent++

      try {
        const notified = await sendPushToUser(delivery.recipient_profile_id, {
          title: 'New message from your coach',
          body: 'You have a new message in Fuel Different.',
          tag: `coach-message-${delivery.athlete_id}`,
          url: '/athlete/dashboard',
        })

        if (notified) {
          pushNotified++
          await service
            .from('scheduled_coach_message_deliveries')
            .update({ push_notified: true })
            .eq('id', delivery.delivery_id)
        }
      } catch (pushError) {
        // The chat message remains delivered even if browser/phone push cannot be sent.
        console.error('[SCHEDULED COACH MESSAGES] Push failed', delivery.delivery_id, pushError)
      }
    }

    return NextResponse.json({
      success: true,
      claimed: deliveries.length,
      sent,
      retried,
      pushNotified,
      failed,
    })
  } catch (error) {
    console.error('[SCHEDULED COACH MESSAGES] Unexpected error', error)
    return NextResponse.json({ error: 'Unable to process scheduled messages' }, { status: 500 })
  }
}

