import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))
}

export async function POST(req: NextRequest) {
  try {
    const { enrollmentId } = await req.json()
    if (!enrollmentId) return NextResponse.json({ error: 'Missing enrollment ID' }, { status: 400 })

    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: staffProfile } = await authSupabase
      .from('profiles')
      .select('role, first_name, full_name')
      .eq('id', user.id)
      .single()
    if (!staffProfile || !['admin', 'super_admin'].includes(staffProfile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })

    const supabaseAdmin = getSupabaseAdmin()
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .select('id, full_name, email, package_name, status, setup_token, coach_id')
      .eq('id', enrollmentId)
      .single()
    if (enrollmentError || !enrollment) return NextResponse.json({ error: 'FUEL 42 participant not found.' }, { status: 404 })
    if (enrollment.status === 'onboarding_complete') return NextResponse.json({ error: 'This participant has already completed app onboarding.' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fueldifferent.app'
    const setupUrl = `${appUrl}/signup?challenge=fuel42&token=${encodeURIComponent(enrollment.setup_token)}&email=${encodeURIComponent(enrollment.email)}`
    const loginUrl = `${appUrl}/login?challenge=fuel42&token=${encodeURIComponent(enrollment.setup_token)}`
    const firstName = enrollment.full_name?.trim().split(' ')[0] || 'there'
    const staffName = staffProfile.first_name || staffProfile.full_name?.split(' ')[0] || 'Kelly'

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Fuel Different <notifications@fueldifferent.app>',
        to: enrollment.email,
        subject: 'Your FUEL 42 app setup is ready',
        html: `
          <div style="background:#0a0e1a;padding:36px 18px;font-family:Arial,Helvetica,sans-serif;color:#f7f9ff">
            <div style="max-width:600px;margin:0 auto;background:#11182a;border:1px solid #263550;padding:34px">
              <p style="margin:0 0 16px;color:#4ade80;font-size:12px;letter-spacing:2px;font-weight:800">IRON FLAG FITNESS · FUEL 42</p>
              <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;color:#ffffff">Your app setup is ready.</h1>
              <p style="color:#c7d0e0;font-size:16px;line-height:1.6">Hi ${escapeHtml(firstName)},</p>
              <p style="color:#c7d0e0;font-size:16px;line-height:1.6">It was great meeting with you. Use the button below to create your Fuel Different account and complete your personalized FUEL 42 setup. Your access is included through October 31.</p>
              <p style="margin:28px 0"><a href="${setupUrl}" style="display:inline-block;background:#4ade80;color:#08110c;text-decoration:none;font-weight:800;padding:15px 22px">SET UP FUEL DIFFERENT</a></p>
              <p style="color:#9eabc0;font-size:14px;line-height:1.6">Already have a Fuel Different account? <a href="${loginUrl}" style="color:#c68bff">Sign in here</a> to activate FUEL 42 access.</p>
              <p style="color:#9eabc0;font-size:14px;line-height:1.6">During setup, you can upload your initial InBody scan, set your goals, and receive your personalized nutrition targets. Message ${escapeHtml(staffName)} through the app whenever you need support.</p>
              <p style="color:#9eabc0;font-size:14px;line-height:1.6;margin:24px 0 0">Need help? Reply to this email or contact hello@fueldifferent.app.</p>
            </div>
          </div>`,
      }),
    })

    if (!emailResponse.ok) {
      const detail = await emailResponse.text()
      console.error('Unable to send FUEL 42 setup email:', detail)
      return NextResponse.json({ error: 'Unable to send the setup email. Please try again.' }, { status: 502 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .update({
        coach_id: enrollment.coach_id || user.id,
        status: 'setup_sent',
        setup_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, setupUrl })
  } catch (error: any) {
    console.error('Unable to send FUEL 42 setup email:', error)
    return NextResponse.json({ error: error.message || 'Unable to send FUEL 42 setup email.' }, { status: 500 })
  }
}
