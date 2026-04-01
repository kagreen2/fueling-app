import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextResponse } from 'next/server'
import {
  MEAL_REMINDERS,
  CHECKIN_REMINDERS,
  HYDRATION_REMINDERS,
  EVENING_REMINDERS,
} from '@/lib/notifications/reminder-lines'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:crossfitironflag@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Determine which reminder category to use based on the hour
function getReminderCategory(hour: number): {
  category: string
  lines: string[]
  title: string
  tag: string
  url: string
} {
  if (hour >= 7 && hour < 10) {
    return {
      category: 'checkin',
      lines: CHECKIN_REMINDERS,
      title: '⚡ Daily Check-in',
      tag: 'checkin-reminder',
      url: '/athlete/checkin',
    }
  } else if (hour >= 11 && hour < 14) {
    return {
      category: 'meal',
      lines: MEAL_REMINDERS,
      title: '🍽️ Meal Time',
      tag: 'meal-reminder',
      url: '/athlete/meals/log',
    }
  } else if (hour >= 14 && hour < 17) {
    return {
      category: 'hydration',
      lines: HYDRATION_REMINDERS,
      title: '💧 Hydration Check',
      tag: 'hydration-reminder',
      url: '/athlete/dashboard',
    }
  } else if (hour >= 18 && hour < 21) {
    return {
      category: 'evening',
      lines: EVENING_REMINDERS,
      title: '🌙 Evening Log',
      tag: 'evening-reminder',
      url: '/athlete/meals/log',
    }
  }
  // Default to meal reminder
  return {
    category: 'meal',
    lines: MEAL_REMINDERS,
    title: '🍽️ Fuel Up',
    tag: 'meal-reminder',
    url: '/athlete/meals/log',
  }
}

function getRandomLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
}

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create admin Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current hour in Central Time (for the target audience)
    const now = new Date()
    const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const hour = centralTime.getHours()

    // Get the appropriate reminder category
    const { lines, title, tag, url } = getReminderCategory(hour)

    // Fetch all active push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, subscription')

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found', sent: 0 })
    }

    // For check-in reminders, skip users who already checked in today
    let skipUserIds: string[] = []
    if (tag === 'checkin-reminder') {
      const today = centralTime.toISOString().split('T')[0]
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('user_id')
        .eq('date', today)

      if (checkins) {
        skipUserIds = checkins.map((c: any) => c.user_id)
      }
    }

    // Send notifications
    let sent = 0
    let failed = 0
    const expiredSubscriptions: string[] = []

    for (const sub of subscriptions) {
      // Skip users who already completed the action
      if (skipUserIds.includes(sub.user_id)) continue

      // Each user gets a different random line
      const body = getRandomLine(lines)

      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title,
            body,
            tag,
            url,
            icon: '/icons/icon-192x192.png',
          })
        )
        sent++
      } catch (error: any) {
        failed++
        // If subscription is expired or invalid, mark for removal
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredSubscriptions.push(sub.id)
        }
        console.error(`Failed to send to user ${sub.user_id}:`, error.statusCode || error.message)
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions)
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      cleaned: expiredSubscriptions.length,
      category: tag,
      hour,
    })
  } catch (error) {
    console.error('Cron send-reminders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
