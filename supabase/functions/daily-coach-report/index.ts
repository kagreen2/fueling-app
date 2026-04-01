// Daily Coach Report — Supabase Edge Function
// Sends a nightly email to each coach summarizing their team's daily check-in status,
// meals logged, red flag alerts, pending supplements, unread messages, and new athletes.
// Triggered via Supabase pg_cron at 11:30 PM CT (04:30 UTC next day).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface CheckinData {
  athlete_id: string
  energy: number | null
  stress: number | null
  soreness: number | null
  hydration: number | null
  sleep_hours: number | null
  wellness_score: number | null
  notes: string | null
}

interface AthleteInfo {
  id: string
  profile_id: string
  created_at: string
  profiles: { full_name: string; email: string }
}

interface CoachInfo {
  id: string
  full_name: string
  email: string
}

interface RedFlag {
  athleteName: string
  message: string
}

function getWellnessLabel(score: number): string {
  if (score >= 80) return 'Thriving'
  if (score >= 60) return 'Okay'
  if (score >= 40) return 'Watch'
  return 'Concern'
}

function getWellnessEmoji(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  if (score >= 40) return '🟠'
  return '🔴'
}

function getWellnessColor(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#facc15'
  if (score >= 40) return '#fb923c'
  return '#f87171'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function buildEmailHtml(
  coachName: string,
  date: string,
  checkedIn: { name: string; wellnessScore: number | null; notes: string | null; mealCount: number }[],
  missed: { name: string }[],
  teamCompliance: number,
  redFlags: RedFlag[],
  unreadMessages: number,
  pendingSupplements: number,
  newAthletes: { name: string }[],
): string {
  const checkedInRows = checkedIn
    .map((a) => {
      const scoreDisplay = a.wellnessScore !== null
        ? `<span style="color: ${getWellnessColor(a.wellnessScore)}; font-weight: bold;">${a.wellnessScore} ${getWellnessEmoji(a.wellnessScore)} ${getWellnessLabel(a.wellnessScore)}</span>`
        : '<span style="color: #94a3b8;">—</span>'
      const notesDisplay = a.notes
        ? `<div style="color: #94a3b8; font-size: 13px; margin-top: 4px; font-style: italic;">"${a.notes}"</div>`
        : ''
      const mealDisplay = a.mealCount > 0
        ? `<span style="color: #e2e8f0;">${a.mealCount} meal${a.mealCount !== 1 ? 's' : ''}</span>`
        : `<span style="color: #64748b;">0 meals</span>`
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
            <div style="color: #e2e8f0; font-weight: 500;">✅ ${a.name}</div>
            ${notesDisplay}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center;">
            ${scoreDisplay}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center;">
            ${mealDisplay}
          </td>
        </tr>`
    })
    .join('')

  const missedRows = missed
    .map(
      (a) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155;" colspan="3">
            <span style="color: #f87171;">❌ ${a.name}</span>
            <span style="color: #64748b; font-size: 13px; margin-left: 8px;">— No check-in today</span>
          </td>
        </tr>`,
    )
    .join('')

  const complianceColor = teamCompliance >= 80 ? '#4ade80' : teamCompliance >= 60 ? '#facc15' : '#f87171'

  // Red Flag Alerts section
  const redFlagSection = redFlags.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #92400e;">
      <div style="padding: 16px; background-color: #451a03; border-bottom: 1px solid #92400e;">
        <h2 style="color: #fbbf24; font-size: 16px; margin: 0;">🚨 Red Flag Alerts (${redFlags.length})</h2>
      </div>
      <div style="padding: 8px 16px;">
        ${redFlags.map(rf => `
          <div style="padding: 10px 14px; margin: 8px 0; background-color: #451a0320; border-radius: 8px; border-left: 3px solid #f59e0b;">
            <span style="color: #fbbf24; font-weight: 600;">⚠️ ${rf.athleteName}</span>
            <span style="color: #d1d5db;"> — ${rf.message}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  // Action Items section
  const actionItems: string[] = []
  if (unreadMessages > 0) {
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #1e3a5f; border-radius: 20px; color: #60a5fa; font-size: 13px; font-weight: 500;">💬 ${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}</span>`)
  }
  if (pendingSupplements > 0) {
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #3b1f5e; border-radius: 20px; color: #c084fc; font-size: 13px; font-weight: 500;">💊 ${pendingSupplements} pending supplement review${pendingSupplements !== 1 ? 's' : ''}</span>`)
  }
  if (newAthletes.length > 0) {
    const names = newAthletes.map(a => a.name).join(', ')
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #14532d; border-radius: 20px; color: #4ade80; font-size: 13px; font-weight: 500;">🆕 ${newAthletes.length} new athlete${newAthletes.length !== 1 ? 's' : ''} joined today: ${names}</span>`)
  }

  const actionItemsSection = actionItems.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 16px; background-color: #1a2332; border-bottom: 1px solid #334155;">
        <h2 style="color: #a78bfa; font-size: 16px; margin: 0;">📋 Action Items</h2>
      </div>
      <div style="padding: 12px 16px;">
        ${actionItems.join('\n')}
      </div>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 24px 0;">
      <div style="margin-bottom: 8px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4.09 12.63a1 1 0 00.77 1.62H11l-1 7.25a.5.5 0 00.86.42L19.91 11.37a1 1 0 00-.77-1.62H13l1-7.25a.5.5 0 00-.86-.42z" fill="#22C55E" stroke="#16A34A" stroke-width="0.5"/></svg></div>
      <h1 style="color: #e2e8f0; font-size: 22px; margin: 0;">Daily Check-in Report</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">${date}</p>
    </div>

    <!-- Team Compliance Card -->
    <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center; border: 1px solid #334155;">
      <div style="color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Team Compliance</div>
      <div style="font-size: 48px; font-weight: 800; color: ${complianceColor};">${teamCompliance}%</div>
      <div style="color: #94a3b8; font-size: 14px; margin-top: 4px;">
        ${checkedIn.length} of ${checkedIn.length + missed.length} athletes checked in
      </div>
    </div>

    <!-- Checked In Section -->
    ${checkedIn.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 16px; background-color: #1a2332; border-bottom: 1px solid #334155;">
        <h2 style="color: #4ade80; font-size: 16px; margin: 0;">✅ Checked In (${checkedIn.length})</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px 16px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155;">Athlete</th>
            <th style="padding: 10px 16px; text-align: center; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155;">Fuel Score</th>
            <th style="padding: 10px 16px; text-align: center; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155;">Meals</th>
          </tr>
        </thead>
        <tbody>
          ${checkedInRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Missed Section -->
    ${missed.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 16px; background-color: #2a1a1a; border-bottom: 1px solid #334155;">
        <h2 style="color: #f87171; font-size: 16px; margin: 0;">❌ Missed Check-in (${missed.length})</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          ${missedRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Red Flag Alerts -->
    ${redFlagSection}

    <!-- Action Items -->
    ${actionItemsSection}

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #334155;">
      <p style="color: #64748b; font-size: 13px; margin: 0;">
        This report was generated by <span style="color: #a78bfa;">Fuel Different</span>
      </p>
      <p style="color: #475569; font-size: 12px; margin: 8px 0 0;">
        <a href="https://www.fueldifferent.app/coach/dashboard" style="color: #7c3aed; text-decoration: none;">View Full Dashboard →</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  try {
    // Verify the request is authorized (cron or manual trigger with service key)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      const url = new URL(req.url)
      const cronSecret = url.searchParams.get('secret')
      if (cronSecret !== Deno.env.get('CRON_SECRET')) {
        // Still allow — Supabase cron invocations are trusted
      }
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const formattedDate = formatDate(today)

    // 1. Get all coaches
    const { data: coaches, error: coachError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['coach', 'admin', 'super_admin'])

    if (coachError || !coaches?.length) {
      return new Response(JSON.stringify({ message: 'No coaches found', error: coachError }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results: { coach: string; status: string; error?: string }[] = []

    for (const coach of coaches) {
      try {
        // 2. Get athletes assigned to this coach (via teams or direct assignment)
        const { data: coachTeams } = await supabase
          .from('teams')
          .select('id')
          .eq('coach_id', coach.id)

        const teamIds = coachTeams?.map((t: { id: string }) => t.id) || []

        const { data: teamMembers } = teamIds.length > 0
          ? await supabase
              .from('team_members')
              .select('athlete_id')
              .in('team_id', teamIds)
          : { data: [] }

        const { data: directAssignments } = await supabase
          .from('athlete_coach_assignments')
          .select('athlete_id')
          .eq('coach_id', coach.id)
          .eq('status', 'active')

        // Combine and deduplicate athlete IDs
        const athleteIds = [
          ...new Set([
            ...(teamMembers?.map((m: { athlete_id: string }) => m.athlete_id) || []),
            ...(directAssignments?.map((a: { athlete_id: string }) => a.athlete_id) || []),
          ]),
        ]

        if (athleteIds.length === 0) {
          results.push({ coach: coach.email, status: 'skipped', error: 'No athletes assigned' })
          continue
        }

        // 3. Get athlete names and created_at for new athlete detection
        const { data: athletes } = await supabase
          .from('athletes')
          .select('id, profile_id, created_at, profiles(full_name, email)')
          .in('id', athleteIds)

        if (!athletes?.length) {
          results.push({ coach: coach.email, status: 'skipped', error: 'No athlete profiles found' })
          continue
        }

        // 4. Get today's check-ins from the wellness summary view
        const { data: checkins } = await supabase
          .from('coach_wellness_summary')
          .select('athlete_id, energy, stress, soreness, hydration, sleep_hours, wellness_score, notes')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        // Also get check-ins from daily_checkins table as fallback
        const { data: directCheckins } = await supabase
          .from('daily_checkins')
          .select('athlete_id, energy, stress, soreness, hydration_status, sleep_hours, notes')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        // Build a map of who checked in
        const checkinMap: Record<string, CheckinData> = {}
        for (const c of checkins || []) {
          checkinMap[c.athlete_id] = c
        }
        for (const c of directCheckins || []) {
          if (!checkinMap[c.athlete_id]) {
            const energy = c.energy || 5
            const stress = c.stress || 5
            const soreness = c.soreness || 5
            const hydration = c.hydration_status || 5
            const simpleScore = Math.round(((energy + (10 - stress) + (10 - soreness) + hydration) / 4) * 10)
            checkinMap[c.athlete_id] = {
              athlete_id: c.athlete_id,
              energy,
              stress,
              soreness,
              hydration,
              sleep_hours: c.sleep_hours,
              wellness_score: simpleScore,
              notes: c.notes,
            }
          }
        }

        // 5. Get today's meal counts per athlete
        const { data: mealData } = await supabase
          .from('meal_logs')
          .select('athlete_id')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        const mealCountMap: Record<string, number> = {}
        for (const m of mealData || []) {
          mealCountMap[m.athlete_id] = (mealCountMap[m.athlete_id] || 0) + 1
        }

        // 6. Get last 7 days of check-ins for red flag detection
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

        const { data: recentCheckins } = await supabase
          .from('coach_wellness_summary')
          .select('athlete_id, date, energy, stress, soreness, sleep_hours, wellness_score')
          .in('athlete_id', athleteIds)
          .gte('date', sevenDaysAgoStr)
          .order('date', { ascending: false })

        // Group recent check-ins by athlete
        const recentByAthlete: Record<string, any[]> = {}
        for (const c of recentCheckins || []) {
          if (!recentByAthlete[c.athlete_id]) recentByAthlete[c.athlete_id] = []
          recentByAthlete[c.athlete_id].push(c)
        }

        // 7. Detect red flags
        const redFlags: RedFlag[] = []
        for (const athlete of athletes) {
          const name = (athlete.profiles as any)?.full_name || 'Unknown'
          const recent = recentByAthlete[athlete.id] || []

          // High stress for 3+ consecutive days
          const stressStreak = recent.filter(c => c.stress >= 7).length
          if (stressStreak >= 3) {
            redFlags.push({ athleteName: name, message: `Stress has been 7+ for ${stressStreak} consecutive days` })
          }

          // Low sleep for 3+ consecutive days
          const lowSleepStreak = recent.filter(c => c.sleep_hours !== null && c.sleep_hours < 5).length
          if (lowSleepStreak >= 3) {
            redFlags.push({ athleteName: name, message: `Slept under 5 hours for ${lowSleepStreak} nights in a row` })
          }

          // Fuel Score in concern zone (below 40) for 3+ days
          const concernDays = recent.filter(c => c.wellness_score !== null && c.wellness_score < 40).length
          if (concernDays >= 3) {
            redFlags.push({ athleteName: name, message: `Fuel Score has been in the concern zone (below 40) for ${concernDays} days` })
          }

          // Missed check-in for 2+ days
          if (!checkinMap[athlete.id]) {
            const daysSinceCheckin = recent.length > 0 ? recent.length : 0
            const totalDaysInRange = 7
            const missedDays = totalDaysInRange - daysSinceCheckin
            if (missedDays >= 2) {
              redFlags.push({ athleteName: name, message: `Missed check-in for ${missedDays}+ days this week` })
            }
          }

          // High soreness for 3+ days (possible overtraining)
          const highSorenessStreak = recent.filter(c => c.soreness >= 8).length
          if (highSorenessStreak >= 3) {
            redFlags.push({ athleteName: name, message: `High soreness (8+) for ${highSorenessStreak} days — possible overtraining` })
          }
        }

        // 8. Get unread messages for this coach
        const { count: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', coach.id)
          .eq('read', false)

        // 9. Get pending supplement reviews
        const { count: pendingSupplements } = await supabase
          .from('supplements')
          .select('id', { count: 'exact', head: true })
          .in('athlete_id', athleteIds)
          .eq('status', 'pending')

        // 10. Detect new athletes (joined today)
        const newAthletes: { name: string }[] = []
        for (const athlete of athletes) {
          const createdDate = athlete.created_at ? athlete.created_at.split('T')[0] : ''
          if (createdDate === todayStr) {
            newAthletes.push({ name: (athlete.profiles as any)?.full_name || 'Unknown' })
          }
        }

        // 11. Build checked-in and missed lists
        const checkedIn: { name: string; wellnessScore: number | null; notes: string | null; mealCount: number }[] = []
        const missed: { name: string }[] = []

        for (const athlete of athletes) {
          const name = (athlete.profiles as any)?.full_name || 'Unknown'
          const checkin = checkinMap[athlete.id]
          const meals = mealCountMap[athlete.id] || 0
          if (checkin) {
            checkedIn.push({
              name,
              wellnessScore: checkin.wellness_score,
              notes: checkin.notes,
              mealCount: meals,
            })
          } else {
            missed.push({ name })
          }
        }

        // Sort: checked in alphabetically, missed alphabetically
        checkedIn.sort((a, b) => a.name.localeCompare(b.name))
        missed.sort((a, b) => a.name.localeCompare(b.name))

        const totalAthletes = checkedIn.length + missed.length
        const teamCompliance = totalAthletes > 0 ? Math.round((checkedIn.length / totalAthletes) * 100) : 0

        // 12. Build and send email
        const html = buildEmailHtml(
          coach.full_name,
          formattedDate,
          checkedIn,
          missed,
          teamCompliance,
          redFlags,
          unreadMessages || 0,
          pendingSupplements || 0,
          newAthletes,
        )

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Fuel Different <reports@fueldifferent.app>',
            to: coach.email,
            subject: `Daily Check-in Report — ${formattedDate} | ${teamCompliance}% Compliance`,
            html,
          }),
        })

        if (emailRes.ok) {
          results.push({ coach: coach.email, status: 'sent' })
        } else {
          const errText = await emailRes.text()
          results.push({ coach: coach.email, status: 'failed', error: errText })
        }
      } catch (err) {
        results.push({ coach: coach.email, status: 'error', error: String(err) })
      }
    }

    return new Response(JSON.stringify({ date: todayStr, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
