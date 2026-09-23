import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/send-push'

const ATHLETE_ROLES = new Set(['athlete', 'member'])
const STAFF_ROLES = new Set(['coach', 'admin', 'super_admin'])

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sendCoachReplyEmail({
  coachEmail,
  coachName,
  athleteName,
  athleteId,
}: {
  coachEmail: string
  coachName: string | null
  athleteName: string
  athleteId: string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[CHAT NOTIFY COACH] RESEND_API_KEY is not configured; skipping email')
    return false
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fueldifferent.app'
  const dashboardLink = `${appUrl}/coach/athlete/${athleteId}`
  const firstName = (coachName || 'Coach').split(' ')[0]
  const safeCoachName = escapeHtml(firstName)
  const safeAthleteName = escapeHtml(athleteName)

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fuel Different <notifications@fueldifferent.app>',
      to: coachEmail,
      subject: `New message from ${athleteName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #334155;">
              <h1 style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">New Message from ${safeAthleteName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">Hey ${safeCoachName}, ${safeAthleteName} has sent you a message in Fuel Different.</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">To protect athlete privacy, the message itself is available only inside the app.</p>
              <div style="margin-top:24px;text-align:center;">
                <a href="${dashboardLink}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Open Conversation</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">Fuel Different · <a href="${appUrl}/coach/dashboard" style="color:#7c3aed;text-decoration:none;">Open Dashboard</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    }),
  })

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text()
    console.error('[CHAT NOTIFY COACH] Email delivery failed:', errorText)
    return false
  }

  return true
}

/**
 * Sends a coach alert after an athlete replies. The server derives all recipients
 * from the saved chat message so a browser cannot direct notifications elsewhere.
 */
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

    if (message.sender_id !== user.id || !ATHLETE_ROLES.has(actor?.role || '')) {
      return NextResponse.json({ success: true, notified: false, reason: 'not_an_athlete_reply' })
    }

    const { data: profiles, error: profileError } = await service
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', [message.sender_id, message.receiver_id])

    if (profileError) throw profileError

    const athleteProfile = profiles?.find(profile => profile.id === message.sender_id)
    const coachProfile = profiles?.find(profile => profile.id === message.receiver_id)

    if (!coachProfile || !STAFF_ROLES.has(coachProfile.role || '')) {
      return NextResponse.json({ success: true, notified: false, reason: 'recipient_is_not_staff' })
    }

    const athleteName = athleteProfile?.full_name || 'An athlete'
    const pushPromise = sendPushToUser(coachProfile.id, {
      title: 'New athlete message',
      body: 'You have a new message in Fuel Different.',
      tag: `athlete-message-${message.athlete_id}`,
      url: `/coach/athlete/${message.athlete_id}`,
    })
    const emailPromise = coachProfile.email
      ? sendCoachReplyEmail({
          coachEmail: coachProfile.email,
          coachName: coachProfile.full_name,
          athleteName,
          athleteId: message.athlete_id,
        })
      : Promise.resolve(false)

    const [pushResult, emailResult] = await Promise.allSettled([pushPromise, emailPromise])
    const pushSent = pushResult.status === 'fulfilled' && pushResult.value
    const emailSent = emailResult.status === 'fulfilled' && emailResult.value

    console.info('[CHAT NOTIFY COACH] Alert delivery attempt complete', {
      messageId: message.id,
      pushSent,
      emailSent,
    })

    return NextResponse.json({ success: true, pushSent, emailSent })
  } catch (error) {
    console.error('[CHAT NOTIFY COACH] Error:', error)
    return NextResponse.json({ error: 'Unable to send coach alert' }, { status: 500 })
  }
}
