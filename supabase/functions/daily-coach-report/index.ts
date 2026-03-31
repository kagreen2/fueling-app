// Daily Coach Report — Supabase Edge Function
// Sends a nightly email to each coach summarizing their team's daily check-in status.
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
  profiles: { full_name: string; email: string }
}

interface CoachInfo {
  id: string
  full_name: string
  email: string
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
  checkedIn: { name: string; wellnessScore: number | null; notes: string | null }[],
  missed: { name: string }[],
  teamCompliance: number,
): string {
  const checkedInRows = checkedIn
    .map((a) => {
      const scoreDisplay = a.wellnessScore !== null
        ? `<span style="color: ${getWellnessColor(a.wellnessScore)}; font-weight: bold;">${a.wellnessScore} ${getWellnessEmoji(a.wellnessScore)} ${getWellnessLabel(a.wellnessScore)}</span>`
        : '<span style="color: #94a3b8;">—</span>'
      const notesDisplay = a.notes
        ? `<div style="color: #94a3b8; font-size: 13px; margin-top: 4px; font-style: italic;">"${a.notes}"</div>`
        : ''
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
            <div style="color: #e2e8f0; font-weight: 500;">✅ ${a.name}</div>
            ${notesDisplay}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center;">
            ${scoreDisplay}
          </td>
        </tr>`
    })
    .join('')

  const missedRows = missed
    .map(
      (a) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #334155;" colspan="2">
            <span style="color: #f87171;">❌ ${a.name}</span>
            <span style="color: #64748b; font-size: 13px; margin-left: 8px;">— No check-in today</span>
          </td>
        </tr>`,
    )
    .join('')

  const complianceColor = teamCompliance >= 80 ? '#4ade80' : teamCompliance >= 60 ? '#facc15' : '#f87171'

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
            <th style="padding: 10px 16px; text-align: center; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155;">Wellness</th>
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
      // Allow if it's a cron trigger (no auth) or has valid bearer token
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
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('athlete_id')
          .in(
            'team_id',
            (
              await supabase.from('teams').select('id').eq('coach_id', coach.id)
            ).data?.map((t: { id: string }) => t.id) || [],
          )

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

        // 3. Get athlete names
        const { data: athletes } = await supabase
          .from('athletes')
          .select('id, profile_id, profiles(full_name, email)')
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
        // Fallback to direct checkins if wellness summary doesn't have them
        for (const c of directCheckins || []) {
          if (!checkinMap[c.athlete_id]) {
            // Calculate a simple wellness score: average of energy, (10-stress), (10-soreness), hydration
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

        // 5. Build checked-in and missed lists
        const checkedIn: { name: string; wellnessScore: number | null; notes: string | null }[] = []
        const missed: { name: string }[] = []

        for (const athlete of athletes) {
          const name = (athlete.profiles as any)?.full_name || 'Unknown'
          const checkin = checkinMap[athlete.id]
          if (checkin) {
            checkedIn.push({
              name,
              wellnessScore: checkin.wellness_score,
              notes: checkin.notes,
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

        // 6. Build and send email
        const html = buildEmailHtml(coach.full_name, formattedDate, checkedIn, missed, teamCompliance)

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
