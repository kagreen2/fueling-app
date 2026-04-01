import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Called after an invited athlete completes signup to mark their invitation as accepted
export async function POST(req: NextRequest) {
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

    const { email } = await req.json()
    const targetEmail = (email || user.email || '').toLowerCase()

    if (!targetEmail) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 })
    }

    // Find pending invitations for this email and mark them as accepted
    // Use the service role or admin client to bypass RLS for this update
    const { data: invitations, error: fetchError } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', targetEmail)
      .eq('status', 'pending')

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (invitations && invitations.length > 0) {
      const ids = invitations.map(i => i.id)
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .in('id', ids)

      if (updateError) {
        console.error('Error updating invitations:', updateError)
      }
    }

    return NextResponse.json({ success: true, updated: invitations?.length || 0 })
  } catch (err: any) {
    console.error('Invitation accepted error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
