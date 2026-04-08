import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:crossfitironflag@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  title: string
  body: string
  tag: string
  url: string
  icon?: string
}

/**
 * Send a push notification to a specific user by their user_id.
 * Returns true if at least one notification was sent successfully.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch all push subscriptions for this user (they may have multiple devices)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      return false
    }

    let sent = false
    const expiredIds: string[] = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            ...payload,
            icon: payload.icon || '/icons/icon-192x192.png',
          })
        )
        sent = true
      } catch (err: any) {
        // Clean up expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredIds.push(sub.id)
        }
        console.error(`Push to user ${userId} failed:`, err.statusCode || err.message)
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
    }

    return sent
  } catch (err) {
    console.error('sendPushToUser error:', err)
    return false
  }
}

/**
 * Send a push notification to all users with a specific role (e.g., 'admin', 'coach').
 * Returns the number of users who received at least one notification.
 */
export async function sendPushToRole(role: string, payload: PushPayload): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users with this role
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', role)

    if (error || !profiles || profiles.length === 0) {
      return 0
    }

    let notifiedCount = 0
    for (const profile of profiles) {
      const success = await sendPushToUser(profile.id, payload)
      if (success) notifiedCount++
    }

    return notifiedCount
  } catch (err) {
    console.error('sendPushToRole error:', err)
    return 0
  }
}
