import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { coachEmail, coachName, athleteName, messagePreview, athleteId } = body

    if (!coachEmail || !athleteName || !messagePreview) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.warn('[CHAT NOTIFY] RESEND_API_KEY not set, skipping email')
      return NextResponse.json({ sent: false, reason: 'No API key' })
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fueldifferent.app'
    const dashboardLink = athleteId
      ? `${APP_URL}/coach/athlete/${athleteId}`
      : `${APP_URL}/coach/dashboard`

    const firstName = (coachName || 'Coach').split(' ')[0]
    const truncatedMessage = messagePreview.length > 200
      ? messagePreview.substring(0, 200) + '...'
      : messagePreview

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #334155;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:24px;">💬</span>
                <h1 style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">
                  New Message from ${athleteName}
                </h1>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">
                Hey ${firstName}, you have a new message:
              </p>
              <div style="background-color:#0f172a;border-radius:12px;padding:16px 20px;border:1px solid #334155;">
                <p style="margin:0 0 8px;font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                  ${athleteName}
                </p>
                <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.6;">
                  "${truncatedMessage}"
                </p>
              </div>
              <div style="margin-top:24px;text-align:center;">
                <a href="${dashboardLink}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
                  Reply to ${athleteName.split(' ')[0]} →
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                Sent by <span style="color:#a78bfa;">Fuel Different</span> · 
                <a href="${APP_URL}/coach/dashboard" style="color:#7c3aed;text-decoration:none;">Open Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fuel Different <notifications@fueldifferent.app>',
        to: coachEmail,
        subject: `💬 New message from ${athleteName}`,
        html,
      }),
    })

    if (emailRes.ok) {
      return NextResponse.json({ sent: true })
    } else {
      const errText = await emailRes.text()
      console.error('[CHAT NOTIFY] Email send failed:', errText)
      return NextResponse.json({ sent: false, error: errText })
    }
  } catch (err: any) {
    console.error('[CHAT NOTIFY] Error:', err.message)
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 })
  }
}
