import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { athleteId } = await req.json()
    if (!athleteId) return NextResponse.json({ error: 'Missing athlete ID' }, { status: 400 })

    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()
    const { data: athlete } = await supabaseAdmin
      .from('athletes')
      .select('id')
      .eq('id', athleteId)
      .eq('profile_id', user.id)
      .single()

    if (!athlete) return NextResponse.json({ error: 'Invalid athlete record' }, { status: 403 })

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .select('id, status, coach_id, onboarding_completed_at')
      .eq('participant_profile_id', user.id)
      .single()

    if (enrollmentError || !enrollment) return NextResponse.json({ success: true, enrolled: false })

    if (enrollment.coach_id) {
      await supabaseAdmin
        .from('athlete_coach_assignments')
        .upsert({ athlete_id: athleteId, coach_id: enrollment.coach_id }, { onConflict: 'athlete_id' })

      if (!enrollment.onboarding_completed_at) {
        const { data: coach } = await supabaseAdmin
          .from('profiles')
          .select('full_name, first_name')
          .eq('id', enrollment.coach_id)
          .single()
        const { data: participant } = await supabaseAdmin
          .from('profiles')
          .select('full_name, first_name')
          .eq('id', user.id)
          .single()
        const coachName = coach?.first_name || coach?.full_name?.split(' ')[0] || 'Kelly'
        const participantFirstName = participant?.first_name || participant?.full_name?.split(' ')[0] || ''

        await supabaseAdmin.from('chat_messages').insert({
          sender_id: enrollment.coach_id,
          receiver_id: user.id,
          athlete_id: athleteId,
          message: `Welcome to FUEL 42${participantFirstName ? `, ${participantFirstName}` : ''}! I’m ${coachName}, and I’ll be in your corner as you build your 42-day rhythm. Reach out here any time you need support with your nutrition, habits, or progress.`,
          read: false,
        })
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('fuel42_enrollments')
      .update({
        athlete_id: athleteId,
        status: 'onboarding_complete',
        onboarding_completed_at: enrollment.onboarding_completed_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)

    if (updateError) throw updateError
    return NextResponse.json({ success: true, enrolled: true })
  } catch (error: any) {
    console.error('Unable to complete FUEL 42 enrollment:', error)
    return NextResponse.json({ error: error.message || 'Unable to complete FUEL 42 enrollment.' }, { status: 500 })
  }
}
