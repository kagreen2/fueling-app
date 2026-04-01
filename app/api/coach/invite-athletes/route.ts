import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fueldifferent.app'

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be a coach, admin, or super_admin
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { emails, teamId } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    if (!teamId) {
      return NextResponse.json({ error: 'No team selected' }, { status: 400 })
    }

    // Verify the coach owns this team (or is admin)
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, invite_code, coach_id')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isAdmin = ['admin', 'super_admin'].includes(profile.role)
    if (!isAdmin && team.coach_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this team' }, { status: 403 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 500 })
    }

    // Validate and deduplicate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails: string[] = []
    const invalidEmails: string[] = []

    for (const raw of emails) {
      const email = raw.trim().toLowerCase()
      if (email && emailRegex.test(email)) {
        if (!validEmails.includes(email)) {
          validEmails.push(email)
        }
      } else if (email) {
        invalidEmails.push(email)
      }
    }

    if (validEmails.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses found', invalidEmails }, { status: 400 })
    }

    // Check which emails are already registered
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('email')
      .in('email', validEmails)

    const existingEmails = new Set((existingProfiles || []).map(p => p.email.toLowerCase()))

    // Check which emails already have pending invitations for this team
    const { data: existingInvites } = await supabase
      .from('invitations')
      .select('email')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .in('email', validEmails)

    const pendingEmails = new Set((existingInvites || []).map(i => i.email.toLowerCase()))

    // Send invitations
    const results = {
      sent: [] as string[],
      alreadyRegistered: [] as string[],
      alreadyInvited: [] as string[],
      failed: [] as string[],
      invalid: invalidEmails,
    }

    const coachName = profile.full_name || 'Your Coach'

    for (const email of validEmails) {
      // Skip already registered users
      if (existingEmails.has(email)) {
        results.alreadyRegistered.push(email)
        continue
      }

      // Skip already invited (pending)
      if (pendingEmails.has(email)) {
        results.alreadyInvited.push(email)
        continue
      }

      // Build the invite link with team code and email pre-filled
      const inviteLink = `${APP_URL}/signup?invite=${encodeURIComponent(team.invite_code)}&email=${encodeURIComponent(email)}`

      // Send the email via Resend
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Fuel Different <notifications@fueldifferent.app>',
            to: email,
            subject: `${coachName} invited you to join ${team.name} on Fuel Different`,
            html: buildInviteEmail(coachName, team.name, inviteLink),
          }),
        })

        if (!emailRes.ok) {
          const errBody = await emailRes.text()
          console.error(`Failed to send invite to ${email}:`, errBody)
          results.failed.push(email)
          continue
        }

        // Record the invitation in the database
        await supabase.from('invitations').insert({
          coach_id: user.id,
          team_id: teamId,
          email,
          invite_code: team.invite_code,
          status: 'pending',
        })

        results.sent.push(email)
      } catch (err) {
        console.error(`Error sending invite to ${email}:`, err)
        results.failed.push(email)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: validEmails.length,
        sent: results.sent.length,
        alreadyRegistered: results.alreadyRegistered.length,
        alreadyInvited: results.alreadyInvited.length,
        failed: results.failed.length,
        invalid: results.invalid.length,
      },
    })
  } catch (err: any) {
    console.error('Invite athletes error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// GET — fetch invitations for the current coach
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const teamId = req.nextUrl.searchParams.get('teamId')

    let query = supabase
      .from('invitations')
      .select('*')
      .eq('coach_id', user.id)
      .order('sent_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data: invitations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

function buildInviteEmail(coachName: string, teamName: string, inviteLink: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449295669/awiUyp6PspLAK7G3oEev6w/fuel-different-lightning-logo-6xVMLtbcQ67esxw8DPzZQL.png" alt="" width="40" height="40" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
    <span style="color: #a855f7; font-size: 24px; font-weight: 700; vertical-align: middle;">Fuel Different</span>
  </div>
  <div style="background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
    <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 16px 0;">You've Been Invited!</h2>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
      <strong style="color: #f8fafc;">${coachName}</strong> has invited you to join <strong style="color: #22c55e;">${teamName}</strong> on Fuel Different.
    </p>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Fuel Different is your personalized sports nutrition platform — get custom meal plans, track your macros, log hydration, and perform at your best.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" style="background-color: #22c55e; color: #0f172a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
        Join ${teamName}
      </a>
    </div>
    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  </div>
  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #475569; font-size: 12px; margin: 0;">
      <a href="https://www.fueldifferent.app" style="color: #a855f7; text-decoration: none;">www.fueldifferent.app</a>
    </p>
  </div>
</div>`
}
