import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, stack, url, userAgent, userId, timestamp, type } = body

    // Log to server console (visible in Vercel logs)
    console.error('[CLIENT ERROR]', JSON.stringify({
      type: type || 'unhandled',
      message,
      stack: stack?.substring(0, 500),
      url,
      userId: userId || 'anonymous',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent?.substring(0, 200),
    }))

    // For critical errors (auth failures, payment errors), optionally email admin
    const isCritical = message?.toLowerCase().includes('payment') ||
                       message?.toLowerCase().includes('stripe') ||
                       message?.toLowerCase().includes('auth') ||
                       type === 'critical'

    if (isCritical && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Fuel Different <notifications@fueldifferent.app>',
            to: process.env.ADMIN_EMAIL || 'kelly@crossfitironflag.com',
            subject: `🔴 Critical Error — Fuel Different`,
            html: `
              <div style="font-family:monospace;background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;">
                <h2 style="color:#ef4444;margin-top:0;">Critical Error Detected</h2>
                <p><strong>Type:</strong> ${type || 'unhandled'}</p>
                <p><strong>Message:</strong> ${message}</p>
                <p><strong>Page:</strong> ${url}</p>
                <p><strong>User:</strong> ${userId || 'anonymous'}</p>
                <p><strong>Time:</strong> ${timestamp || new Date().toISOString()}</p>
                <pre style="background:#0f172a;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px;">${stack?.substring(0, 1000) || 'No stack trace'}</pre>
                <p style="color:#64748b;font-size:12px;margin-top:16px;">Check Vercel logs for full details.</p>
              </div>
            `,
          }),
        })
      } catch {
        // Don't fail the error report if email fails
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }
}
