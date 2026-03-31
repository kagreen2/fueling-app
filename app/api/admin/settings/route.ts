import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Shared helper: authenticate the caller and verify admin/super_admin role.
 * Returns { user, profile } on success, or a NextResponse error.
 */
async function requireAdmin() {
  const authSupabase = await createServerClient()
  const { data: { user }, error: authError } = await authSupabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await authSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 }) }
  }

  return { user, profile }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all admin settings
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert to key-value object
    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    return NextResponse.json(settingsMap)
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const { setting_key, setting_value } = await request.json()
    
    if (!setting_key || setting_value === undefined) {
      return NextResponse.json({ error: 'setting_key and setting_value are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update setting
    const { data: updated, error } = await supabase
      .from('admin_settings')
      .update({ setting_value, updated_at: new Date().toISOString() })
      .eq('setting_key', setting_key)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
