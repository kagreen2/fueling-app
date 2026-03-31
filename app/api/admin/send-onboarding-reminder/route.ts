import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 1. Authenticate — only admin/super_admin can send reminders
  const authSupabase = await createServerClient()
  const { data: { user }, error: authError } = await authSupabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await authSupabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  // 2. Parse request
  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // 3. Look up the target user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 4. Verify user actually hasn't onboarded
  const { data: athleteRecord } = await supabaseAdmin
    .from('athletes')
    .select('id')
    .eq('profile_id', userId)
    .single()

  if (athleteRecord) {
    return NextResponse.json({ error: 'User has already completed onboarding' }, { status: 400 })
  }

  // 5. Build the onboarding URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || req.nextUrl.origin
  const onboardingUrl = `${appUrl}/athlete/onboarding`

  // 6. Send the email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 500 })
  }

  const firstName = targetUser.full_name?.split(' ')[0] || 'there'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#1e293b; border-radius:16px; overflow:hidden; border:1px solid #334155;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px; text-align:center; border-bottom:1px solid #334155;">
              <h1 style="margin:0; font-size:24px; font-weight:700; color:#a855f7;">
                ⚡ Fuel Different
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:#f1f5f9;">
                Hey ${firstName}! 👋
              </h2>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#94a3b8;">
                We noticed you signed up for Fuel Different but haven't finished setting up your profile yet. Your personalized nutrition plan is just a few steps away!
              </p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#94a3b8;">
                Complete your onboarding to unlock:
              </p>
              <ul style="margin:0 0 28px; padding-left:20px; font-size:14px; line-height:2; color:#cbd5e1;">
                <li>Personalized daily calorie & macro targets</li>
                <li>AI-powered meal photo analysis</li>
                <li>Daily check-ins & wellness tracking</li>
                <li>Coach feedback & support</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${onboardingUrl}" style="display:inline-block; padding:14px 36px; background-color:#22c55e; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:10px;">
                      Complete My Profile →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:#64748b; text-align:center;">
                It only takes about 2 minutes to finish.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid #334155; text-align:center;">
              <p style="margin:0; font-size:12px; color:#475569;">
                Sent by ${callerProfile.full_name || 'your coach'} via Fuel Different
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fuel Different <notifications@fueldifferent.app>',
        to: targetUser.email,
        subject: `${firstName}, finish setting up your Fuel Different profile!`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend error:', errText)
      return NextResponse.json({ error: 'Failed to send email', details: errText }, { status: 500 })
    }

    // 7. Also set an in-app reminder flag on the profile
    await supabaseAdmin
      .from('profiles')
      .update({ 
        onboarding_reminder_sent: true,
        onboarding_reminder_sent_at: new Date().toISOString()
      })
      .eq('id', userId)

    return NextResponse.json({ 
      success: true, 
      message: `Onboarding reminder sent to ${targetUser.email}` 
    })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
