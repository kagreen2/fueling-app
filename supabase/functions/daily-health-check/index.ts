// Daily Health Check — Supabase Edge Function
// Calls the /api/health endpoint and emails a status report to the admin.
// Schedule via pg_cron: SELECT cron.schedule('daily-health-check', '0 13 * * *', $$...$$)
// That's 8:00 AM CT (13:00 UTC)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://www.fueldifferent.app'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'kelly@crossfitironflag.com'

Deno.serve(async () => {
  try {
    // 1. Call the health endpoint
    const healthRes = await fetch(`${APP_URL}/api/health`)
    const health = await healthRes.json()

    const status = health.status // 'healthy' | 'degraded' | 'down'
    const checks = health.checks || []
    const timestamp = health.timestamp || new Date().toISOString()

    const allPassing = checks.every((c: any) => c.status === 'pass')

    // 2. Build the status emoji and subject line
    const statusEmoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '🔴'
    const subject = `${statusEmoji} Fuel Different Daily Health Check — ${status.toUpperCase()}`

    // 3. Build the email HTML
    const checkRows = checks.map((c: any) => {
      const icon = c.status === 'pass' ? '✅' : '❌'
      const nameMap: Record<string, string> = {
        database: 'Database (Supabase)',
        auth_service: 'Auth Service',
        stripe: 'Stripe Payments',
        email_service: 'Email (Resend)',
      }
      const displayName = nameMap[c.name] || c.name
      const latency = c.latency_ms ? `${c.latency_ms}ms` : '—'
      const message = c.message ? `<br><span style="color:#ef4444;font-size:12px;">${c.message}</span>` : ''

      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #334155;color:#e2e8f0;font-size:14px;">
            ${icon} ${displayName}${message}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #334155;color:#94a3b8;font-size:14px;text-align:right;">
            ${latency}
          </td>
        </tr>`
    }).join('')

    const formattedTime = new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #334155;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#a855f7;">
                ⚡ Fuel Different — Health Check
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#64748b;">${formattedTime} CT</p>
            </td>
          </tr>

          <!-- Overall Status -->
          <tr>
            <td style="padding:24px 32px;">
              <div style="background-color:${allPassing ? '#064e3b' : '#7f1d1d'};border:1px solid ${allPassing ? '#065f46' : '#991b1b'};border-radius:12px;padding:16px 20px;text-align:center;">
                <p style="margin:0;font-size:28px;">${statusEmoji}</p>
                <p style="margin:8px 0 0;font-size:18px;font-weight:600;color:${allPassing ? '#34d399' : '#fca5a5'};">
                  ${allPassing ? 'All Systems Operational' : `Status: ${status.toUpperCase()}`}
                </p>
              </div>
            </td>
          </tr>

          <!-- Check Details -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#0f172a;">
                  <th style="padding:10px 16px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Service</th>
                  <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Latency</th>
                </tr>
                ${checkRows}
              </table>
            </td>
          </tr>

          ${!allPassing ? `
          <!-- Action Required -->
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background-color:#451a03;border:1px solid #92400e;border-radius:8px;padding:12px 16px;">
                <p style="margin:0;font-size:13px;color:#fbbf24;">
                  ⚠️ One or more services are not responding normally. Check your Supabase dashboard and Vercel logs for details.
                </p>
              </div>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                <a href="${APP_URL}/api/health" style="color:#a855f7;text-decoration:none;">View live status</a>
                &nbsp;·&nbsp; Sent automatically by Fuel Different
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // 4. Send the email
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fuel Different <notifications@fueldifferent.app>',
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    })

    if (emailRes.ok) {
      return new Response(JSON.stringify({ success: true, status, sent_to: ADMIN_EMAIL }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      const errText = await emailRes.text()
      return new Response(JSON.stringify({ success: false, error: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
