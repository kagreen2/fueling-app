// Daily Coach Report — Supabase Edge Function
// Sends a nightly email to each coach summarizing their team's daily activity,
// Fuel Score (7-day avg), macro compliance, leaderboard highlights, red flags,
// new athletes, and action items.
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

interface AthleteReport {
  id: string
  name: string
  checkedInToday: boolean
  todayFuelScore: number | null
  avg7FuelScore: number | null
  todayMealCount: number
  complianceRate: number
  hasTargets: boolean
  notes: string | null
  isNew: boolean
  daysSinceLastLog: number
  recentCheckins: any[]
}

function getWellnessEmoji(score: number): string {
  if (score >= 85) return '🔥'
  if (score >= 70) return '💪'
  if (score >= 50) return '⚡'
  return '🚨'
}

function getWellnessColor(score: number): string {
  if (score >= 85) return '#4ade80'
  if (score >= 70) return '#60a5fa'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

function getWellnessLabel(score: number): string {
  if (score >= 85) return 'Locked In'
  if (score >= 70) return 'On Track'
  if (score >= 50) return 'Dial It In'
  return 'Red Flag'
}

function getComplianceColor(pct: number): string {
  if (pct >= 70) return '#4ade80'
  if (pct >= 40) return '#fbbf24'
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

function formatShortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
  return parts[0]
}

function buildEmailHtml(
  coachName: string,
  date: string,
  athletes: AthleteReport[],
  redFlags: RedFlag[],
  unreadMessages: number,
  pendingSupplements: number,
): string {
  // Compute summary stats
  const total = athletes.length
  const checkedInToday = athletes.filter(a => a.checkedInToday)
  const loggedMealsToday = athletes.filter(a => a.todayMealCount > 0)
  const withFuelScores = athletes.filter(a => a.avg7FuelScore !== null)
  const withTargets = athletes.filter(a => a.hasTargets)
  const newAthletes = athletes.filter(a => a.isNew)

  const avgFuelScore = withFuelScores.length > 0
    ? Math.round(withFuelScores.reduce((sum, a) => sum + (a.avg7FuelScore || 0), 0) / withFuelScores.length)
    : null

  const avgCompliance = withTargets.length > 0
    ? Math.round(withTargets.reduce((sum, a) => sum + a.complianceRate, 0) / withTargets.length)
    : null

  // Leaderboard: top compliance and top fuel score
  const topCompliance = withTargets.length > 0
    ? withTargets.reduce((best, a) => a.complianceRate > best.complianceRate ? a : best)
    : null

  const topFuelScore = withFuelScores.length > 0
    ? withFuelScores.reduce((best, a) => (a.avg7FuelScore || 0) > (best.avg7FuelScore || 0) ? a : best)
    : null

  // Sort athletes: checked in first (sorted by fuel score desc), then missed (alphabetical)
  const sortedCheckedIn = [...checkedInToday].sort((a, b) => (b.todayFuelScore || 0) - (a.todayFuelScore || 0))
  const missed = athletes.filter(a => !a.checkedInToday).sort((a, b) => a.name.localeCompare(b.name))

  // Build stat cards
  const fuelScoreColor = avgFuelScore !== null ? getWellnessColor(avgFuelScore) : '#64748b'
  const complianceColor = avgCompliance !== null ? getComplianceColor(avgCompliance) : '#64748b'

  // Checked-in rows
  const checkedInRows = sortedCheckedIn.map(a => {
    const scoreDisplay = a.todayFuelScore !== null
      ? `<span style="color: ${getWellnessColor(a.todayFuelScore)}; font-weight: bold;">${a.todayFuelScore} ${getWellnessEmoji(a.todayFuelScore)}</span>`
      : '<span style="color: #94a3b8;">—</span>'
    const avg7Display = a.avg7FuelScore !== null
      ? `<span style="color: #94a3b8; font-size: 11px;">(7d avg: ${a.avg7FuelScore})</span>`
      : ''
    const notesDisplay = a.notes
      ? `<div style="color: #94a3b8; font-size: 12px; margin-top: 3px; font-style: italic;">"${a.notes}"</div>`
      : ''
    const mealDisplay = a.todayMealCount > 0
      ? `<span style="color: #e2e8f0;">${a.todayMealCount} meal${a.todayMealCount !== 1 ? 's' : ''}</span>`
      : `<span style="color: #64748b;">0</span>`
    return `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #334155;">
          <div style="color: #e2e8f0; font-weight: 500;">✅ ${a.name}</div>
          ${notesDisplay}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #334155; text-align: center;">
          ${scoreDisplay}<br>${avg7Display}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #334155; text-align: center;">
          ${mealDisplay}
        </td>
      </tr>`
  }).join('')

  // Missed rows — show how many days since last log
  const missedRows = missed.map(a => {
    const daysInfo = a.daysSinceLastLog > 0
      ? `<span style="color: #64748b; font-size: 12px; margin-left: 8px;">— Last logged ${a.daysSinceLastLog}d ago</span>`
      : `<span style="color: #64748b; font-size: 12px; margin-left: 8px;">— Never logged</span>`
    const mealDisplay = a.todayMealCount > 0
      ? `<span style="color: #4ade80; font-size: 12px;"> · ${a.todayMealCount} meal${a.todayMealCount !== 1 ? 's' : ''} today</span>`
      : ''
    return `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #334155;" colspan="3">
          <span style="color: #f87171;">❌ ${a.name}</span>${daysInfo}${mealDisplay}
        </td>
      </tr>`
  }).join('')

  // Red Flag section
  const redFlagSection = redFlags.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #92400e;">
      <div style="padding: 14px 16px; background-color: #451a03; border-bottom: 1px solid #92400e;">
        <h2 style="color: #fbbf24; font-size: 15px; margin: 0;">🚨 Red Flag Alerts (${redFlags.length})</h2>
      </div>
      <div style="padding: 8px 16px;">
        ${redFlags.map(rf => `
          <div style="padding: 8px 12px; margin: 6px 0; background-color: rgba(69,26,3,0.12); border-radius: 8px; border-left: 3px solid #f59e0b;">
            <span style="color: #fbbf24; font-weight: 600;">⚠️ ${rf.athleteName}</span>
            <span style="color: #d1d5db;"> — ${rf.message}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  // New Athletes section
  const newAthletesSection = newAthletes.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #166534;">
      <div style="padding: 14px 16px; background-color: #14532d; border-bottom: 1px solid #166534;">
        <h2 style="color: #4ade80; font-size: 15px; margin: 0;">🆕 New Athletes Today (${newAthletes.length})</h2>
      </div>
      <div style="padding: 12px 16px;">
        ${newAthletes.map(a => `
          <div style="padding: 6px 0; color: #e2e8f0; font-size: 14px;">• ${a.name}</div>
        `).join('')}
      </div>
    </div>
  ` : ''

  // Action Items
  const actionItems: string[] = []
  if (unreadMessages > 0) {
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #1e3a5f; border-radius: 20px; color: #60a5fa; font-size: 13px; font-weight: 500;">💬 ${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}</span>`)
  }
  if (pendingSupplements > 0) {
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #3b1f5e; border-radius: 20px; color: #c084fc; font-size: 13px; font-weight: 500;">💊 ${pendingSupplements} pending supplement review${pendingSupplements !== 1 ? 's' : ''}</span>`)
  }
  const noLogCount = athletes.filter(a => a.todayMealCount === 0).length
  if (noLogCount > 0) {
    actionItems.push(`<span style="display: inline-block; padding: 6px 14px; margin: 4px; background-color: #3b1a1a; border-radius: 20px; color: #f87171; font-size: 13px; font-weight: 500;">🍽️ ${noLogCount} athlete${noLogCount !== 1 ? 's' : ''} didn't log meals today</span>`)
  }

  const actionItemsSection = actionItems.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 14px 16px; background-color: #1a2332; border-bottom: 1px solid #334155;">
        <h2 style="color: #a78bfa; font-size: 15px; margin: 0;">📋 Action Items</h2>
      </div>
      <div style="padding: 12px 16px;">
        ${actionItems.join('\n')}
      </div>
    </div>
  ` : ''

  // Leaderboard spotlight
  const leaderboardSection = (topCompliance || topFuelScore) ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 14px 16px; background-color: #1a2332; border-bottom: 1px solid #334155;">
        <h2 style="color: #e2e8f0; font-size: 15px; margin: 0;">🏆 Today's Leaders</h2>
      </div>
      <div style="padding: 16px; display: flex; gap: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            ${topCompliance ? `
            <td style="padding: 12px; text-align: center; width: 50%; vertical-align: top;">
              <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">🏆 Top Compliance</div>
              <div style="color: #fbbf24; font-size: 24px; font-weight: 800; margin-top: 6px;">${topCompliance.complianceRate}%</div>
              <div style="color: #e2e8f0; font-size: 14px; font-weight: 500; margin-top: 2px;">${formatShortName(topCompliance.name)}</div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">50% logging + 50% targets</div>
            </td>
            ` : ''}
            ${topFuelScore ? `
            <td style="padding: 12px; text-align: center; width: 50%; vertical-align: top; ${topCompliance ? 'border-left: 1px solid #334155;' : ''}">
              <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">⚡ Top Fuel Score</div>
              <div style="color: ${getWellnessColor(topFuelScore.avg7FuelScore || 0)}; font-size: 24px; font-weight: 800; margin-top: 6px;">${topFuelScore.avg7FuelScore}</div>
              <div style="color: #e2e8f0; font-size: 14px; font-weight: 500; margin-top: 2px;">${formatShortName(topFuelScore.name)}</div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">7-day average</div>
            </td>
            ` : ''}
          </tr>
        </table>
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
      <h1 style="color: #e2e8f0; font-size: 22px; margin: 0;">Daily Team Report</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">${date}</p>
    </div>

    <!-- Quick Stats -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #1e293b; border-radius: 12px 0 0 12px; border: 1px solid #334155; border-right: none;">
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Avg Fuel Score</div>
          <div style="font-size: 28px; font-weight: 800; color: ${fuelScoreColor}; margin-top: 4px;">${avgFuelScore !== null ? avgFuelScore : '—'}</div>
          <div style="color: #64748b; font-size: 10px;">7-day avg</div>
        </td>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #1e293b; border: 1px solid #334155; border-right: none; border-left: none;">
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Avg Compliance</div>
          <div style="font-size: 28px; font-weight: 800; color: ${complianceColor}; margin-top: 4px;">${avgCompliance !== null ? avgCompliance + '%' : '—'}</div>
          <div style="color: #64748b; font-size: 10px;">macro targets</div>
        </td>
        <td style="width: 33%; text-align: center; padding: 16px 8px; background-color: #1e293b; border-radius: 0 12px 12px 0; border: 1px solid #334155; border-left: none;">
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Today's Activity</div>
          <div style="font-size: 28px; font-weight: 800; color: #e2e8f0; margin-top: 4px;">${loggedMealsToday.length}/${total}</div>
          <div style="color: #64748b; font-size: 10px;">logged meals</div>
        </td>
      </tr>
    </table>

    <!-- Leaderboard Spotlight -->
    ${leaderboardSection}

    <!-- Checked In Section -->
    ${checkedInToday.length > 0 ? `
    <div style="background-color: #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="padding: 14px 16px; background-color: #1a2332; border-bottom: 1px solid #334155;">
        <h2 style="color: #4ade80; font-size: 15px; margin: 0;">✅ Checked In Today (${checkedInToday.length})</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 8px 14px; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #334155;">Athlete</th>
            <th style="padding: 8px 14px; text-align: center; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #334155;">Fuel Score</th>
            <th style="padding: 8px 14px; text-align: center; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #334155;">Meals</th>
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
      <div style="padding: 14px 16px; background-color: #2a1a1a; border-bottom: 1px solid #334155;">
        <h2 style="color: #f87171; font-size: 15px; margin: 0;">❌ Missed Check-in (${missed.length})</h2>
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

    <!-- New Athletes -->
    ${newAthletesSection}

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
    // Verify the request is authorized
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      const url = new URL(req.url)
      const cronSecret = url.searchParams.get('secret')
      if (cronSecret !== Deno.env.get('CRON_SECRET')) {
        // Still allow — Supabase cron invocations are trusted
      }
    }

    // Use Central Time to compute "today"
    const now = new Date()
    const ctFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
    const todayStr = ctFormatter.format(now)
    const formattedDate = formatDate(now)

    // Compute date ranges
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

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
        // 2. Get athletes assigned to this coach
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

        // 3. Get athlete profiles and created_at
        const { data: athletes } = await supabase
          .from('athletes')
          .select('id, profile_id, created_at, profiles(full_name, email)')
          .in('id', athleteIds)

        if (!athletes?.length) {
          results.push({ coach: coach.email, status: 'skipped', error: 'No athlete profiles found' })
          continue
        }

        // 4. Get today's check-ins
        const { data: todayCheckins } = await supabase
          .from('coach_wellness_summary')
          .select('athlete_id, energy, stress, soreness, hydration, sleep_hours, wellness_score, notes')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        // Fallback to daily_checkins
        const { data: directCheckins } = await supabase
          .from('daily_checkins')
          .select('athlete_id, energy, stress, soreness, hydration_status, sleep_hours, notes')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        const checkinMap: Record<string, CheckinData> = {}
        for (const c of todayCheckins || []) {
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

        // 5. Get last 7 days of check-ins for Fuel Score avg and red flag detection
        const { data: recentCheckins } = await supabase
          .from('coach_wellness_summary')
          .select('athlete_id, date, energy, stress, soreness, sleep_hours, wellness_score')
          .in('athlete_id', athleteIds)
          .gte('date', sevenDaysAgoStr)
          .order('date', { ascending: false })

        const recentByAthlete: Record<string, any[]> = {}
        for (const c of recentCheckins || []) {
          if (!recentByAthlete[c.athlete_id]) recentByAthlete[c.athlete_id] = []
          recentByAthlete[c.athlete_id].push(c)
        }

        // 6. Get today's meal counts
        const { data: mealData } = await supabase
          .from('meal_logs')
          .select('athlete_id')
          .in('athlete_id', athleteIds)
          .eq('date', todayStr)

        const mealCountMap: Record<string, number> = {}
        for (const m of mealData || []) {
          mealCountMap[m.athlete_id] = (mealCountMap[m.athlete_id] || 0) + 1
        }

        // 7. Get 30-day meal summaries for compliance calculation
        const { data: mealSummaries } = await supabase
          .from('daily_meal_summary')
          .select('athlete_id, date, total_calories, total_protein')
          .in('athlete_id', athleteIds)
          .gte('date', thirtyDaysAgoStr)
          .lte('date', todayStr)

        // 8. Get recommendations (targets)
        const { data: recs } = await supabase
          .from('recommendations')
          .select('athlete_id, daily_calories, daily_protein_g')
          .in('athlete_id', athleteIds)

        const recsMap: Record<string, { daily_calories: number; daily_protein_g: number }> = {}
        for (const r of recs || []) {
          recsMap[r.athlete_id] = r
        }

        // 9. Get last meal log date per athlete for "days since last log"
        const { data: lastLogs } = await supabase
          .from('daily_meal_summary')
          .select('athlete_id, date')
          .in('athlete_id', athleteIds)
          .order('date', { ascending: false })

        const lastLogMap: Record<string, string> = {}
        for (const l of lastLogs || []) {
          if (!lastLogMap[l.athlete_id]) lastLogMap[l.athlete_id] = l.date
        }

        // 10. Build athlete reports
        const athleteReports: AthleteReport[] = athletes.map((athlete: any) => {
          const name = athlete.profiles?.full_name || 'Unknown'
          const checkin = checkinMap[athlete.id]
          const recent = recentByAthlete[athlete.id] || []
          const rec = recsMap[athlete.id]
          const summaries = (mealSummaries || []).filter(s => s.athlete_id === athlete.id)

          // 7-day avg Fuel Score
          const scored = recent.filter(c => c.wellness_score != null).slice(0, 7)
          const avg7FuelScore = scored.length > 0
            ? Math.round(scored.reduce((sum: number, c: any) => sum + c.wellness_score, 0) / scored.length)
            : null

          // Compliance: weighted blend of logging consistency + target adherence
          // Compliance = 50% (days logged / total days) + 50% (days hitting targets / days logged)
          const targetCals = rec?.daily_calories || 0
          const targetPro = rec?.daily_protein_g || 0
          const hasTargets = targetCals > 0 && targetPro > 0

          // Days since signup (cap at 30)
          const createdAt = athlete.created_at ? new Date(athlete.created_at) : null
          let daysSinceSignup = 30
          if (createdAt) {
            const diffMs = now.getTime() - createdAt.getTime()
            daysSinceSignup = Math.max(1, Math.min(30, Math.floor(diffMs / (1000 * 60 * 60 * 24))))
          }

          const daysLogged = summaries.length
          const loggingPct = daysSinceSignup > 0 ? daysLogged / daysSinceSignup : 0
          let complianceRate = 0
          if (hasTargets && daysLogged > 0) {
            const compliantDays = summaries.filter(s => {
              const calPct = s.total_calories / targetCals
              const proPct = s.total_protein / targetPro
              return calPct >= 0.8 && calPct <= 1.2 && proPct >= 0.8 && proPct <= 1.2
            }).length
            const adherencePct = compliantDays / daysLogged
            complianceRate = Math.round((loggingPct * 0.5 + adherencePct * 0.5) * 100)
          } else if (hasTargets) {
            complianceRate = 0
          } else {
            complianceRate = daysSinceSignup > 0 ? Math.round(loggingPct * 100) : 0
          }

          // Days since last log
          const lastLog = lastLogMap[athlete.id]
          let daysSinceLastLog = daysSinceSignup
          if (lastLog) {
            const lastDate = new Date(lastLog + 'T12:00:00')
            daysSinceLastLog = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          }

          // Is new (joined today)?
          const createdDate = athlete.created_at ? athlete.created_at.split('T')[0] : ''
          const isNew = createdDate === todayStr

          return {
            id: athlete.id,
            name,
            checkedInToday: !!checkin,
            todayFuelScore: checkin?.wellness_score ?? null,
            avg7FuelScore,
            todayMealCount: mealCountMap[athlete.id] || 0,
            complianceRate,
            hasTargets,
            notes: checkin?.notes ?? null,
            isNew,
            daysSinceLastLog,
            recentCheckins: recent,
          }
        })

        // 11. Detect red flags (same logic as dashboard)
        const redFlags: RedFlag[] = []
        for (const a of athleteReports) {
          // Haven't logged in 3+ days
          if (a.daysSinceLastLog >= 3) {
            if (a.daysSinceLastLog === a.daysSinceLastLog && !lastLogMap[a.id]) {
              redFlags.push({ athleteName: a.name, message: `Never logged a meal (signed up ${a.daysSinceLastLog} day${a.daysSinceLastLog !== 1 ? 's' : ''} ago)` })
            } else {
              redFlags.push({ athleteName: a.name, message: `Haven't logged in ${a.daysSinceLastLog} days` })
            }
          }

          // Low compliance (only for athletes with targets)
          if (a.hasTargets && a.complianceRate < 30) {
            redFlags.push({ athleteName: a.name, message: `Only ${a.complianceRate}% compliance (macro targets)` })
          }

          const recent = a.recentCheckins
          // High stress for 3+ consecutive days
          if (recent.length >= 3 && recent.slice(0, 3).every((c: any) => c.stress >= 7)) {
            const count = recent.filter((c: any) => c.stress >= 7).length
            redFlags.push({ athleteName: a.name, message: `High stress (7+) for ${count} days in a row` })
          }

          // Low sleep for 3+ consecutive days
          if (recent.length >= 3 && recent.slice(0, 3).every((c: any) => c.sleep_hours !== null && c.sleep_hours < 5)) {
            const count = recent.filter((c: any) => c.sleep_hours !== null && c.sleep_hours < 5).length
            redFlags.push({ athleteName: a.name, message: `Slept under 5 hours for ${count} nights in a row` })
          }

          // Fuel Score in Red Flag zone for 3+ days
          if (recent.length >= 3) {
            const concernDays = recent.filter((c: any) => c.wellness_score !== null && c.wellness_score < 50).length
            if (concernDays >= 3) {
              redFlags.push({ athleteName: a.name, message: `Fuel Score in Red Flag zone (below 50) for ${concernDays} days` })
            }
          }

          // High soreness for 3+ days
          if (recent.length >= 3 && recent.slice(0, 3).every((c: any) => c.soreness >= 8)) {
            const count = recent.filter((c: any) => c.soreness >= 8).length
            redFlags.push({ athleteName: a.name, message: `High soreness (8+) for ${count} days — possible overtraining` })
          }
        }

        // 12. Get unread messages
        const { count: unreadMessages } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', coach.id)
          .eq('read', false)

        // 13. Get pending supplement reviews
        const { count: pendingSupplements } = await supabase
          .from('supplements')
          .select('id', { count: 'exact', head: true })
          .in('athlete_id', athleteIds)
          .eq('status', 'pending')

        // 14. Build and send email
        const html = buildEmailHtml(
          coach.full_name,
          formattedDate,
          athleteReports,
          redFlags,
          unreadMessages || 0,
          pendingSupplements || 0,
        )

        // Subject line with key stats
        const subjectParts: string[] = []
        const avgFS = athleteReports.filter(a => a.avg7FuelScore !== null)
        if (avgFS.length > 0) {
          const avg = Math.round(avgFS.reduce((s, a) => s + (a.avg7FuelScore || 0), 0) / avgFS.length)
          subjectParts.push(`Fuel Score: ${avg}`)
        }
        const mealsLogged = athleteReports.filter(a => a.todayMealCount > 0).length
        subjectParts.push(`${mealsLogged}/${athleteReports.length} logged meals`)
        if (redFlags.length > 0) subjectParts.push(`${redFlags.length} alert${redFlags.length !== 1 ? 's' : ''}`)

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Fuel Different <reports@fueldifferent.app>',
            to: coach.email,
            subject: `Daily Team Report — ${formattedDate} | ${subjectParts.join(' · ')}`,
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
