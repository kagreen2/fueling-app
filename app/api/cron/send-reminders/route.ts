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

// Determine which reminder category to use based on the hour (Central Time)
// Schedule: 9am check-in / 1pm meal / 3pm hydration / 8pm evening
function getReminderCategory(hour: number): {
  category: string
  lines: string[]
  title: string
  tag: string
  url: string
} {
  if (hour >= 8 && hour < 11) {
    return {
      category: 'checkin',
      lines: CHECKIN_REMINDERS,
      title: '⚡ Daily Check-in',
      tag: 'checkin-reminder',
      url: '/athlete/checkin',
    }
  } else if (hour >= 12 && hour < 15) {
    return {
      category: 'meal',
      lines: MEAL_REMINDERS,
      title: '🍽️ Meal Time',
      tag: 'meal-reminder',
      url: '/athlete/meals/log',
    }
  } else if (hour >= 15 && hour < 17) {
    return {
      category: 'hydration',
      lines: HYDRATION_REMINDERS,
      title: '💧 Hydration Check',
      tag: 'hydration-reminder',
      url: '/athlete/dashboard',
    }
  } else if (hour >= 19 && hour < 22) {
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
    const today = centralTime.toISOString().split('T')[0]

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

    // Smart skipping — don't bug athletes who already did the thing
    let skipUserIds: string[] = []

    if (tag === 'checkin-reminder') {
      // Skip users who already checked in today
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('user_id')
        .eq('date', today)

      if (checkins) {
        skipUserIds = checkins.map((c: any) => c.user_id)
      }
    }

    if (tag === 'meal-reminder' || tag === 'evening-reminder') {
      // Skip users who have already logged at least one meal today
      // For the 1pm reminder: skip if they logged lunch
      // For the 8pm reminder: skip if they've logged 3+ meals (full day)
      const minMeals = tag === 'evening-reminder' ? 3 : 1

      const { data: mealCounts } = await supabase
        .from('meal_logs')
        .select('athlete_id')
        .eq('date', today)

      if (mealCounts) {
        // Count meals per athlete
        const countByAthlete: Record<string, number> = {}
        for (const m of mealCounts) {
          countByAthlete[m.athlete_id] = (countByAthlete[m.athlete_id] || 0) + 1
        }

        // Get user_ids for athletes who meet the threshold
        // We need to map athlete_id -> user_id
        const athleteIds = Object.entries(countByAthlete)
          .filter(([_, count]) => count >= minMeals)
          .map(([athleteId]) => athleteId)

        if (athleteIds.length > 0) {
          const { data: athletes } = await supabase
            .from('athletes')
            .select('id, user_id')
            .in('id', athleteIds)

          if (athletes) {
            skipUserIds = athletes.map((a: any) => a.user_id)
          }
        }
      }
    }

    // Send notifications
    let sent = 0
    let failed = 0
    let skipped = 0
    const expiredSubscriptions: string[] = []

    for (const sub of subscriptions) {
      // Skip users who already completed the action
      if (skipUserIds.includes(sub.user_id)) {
        skipped++
        continue
      }

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
      skipped,
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
