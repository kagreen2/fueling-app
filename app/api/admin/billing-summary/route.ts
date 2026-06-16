import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    // Auth check — only admins/super_admins
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseAdmin = getSupabaseAdmin()
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all active subscriptions from Stripe
    const subscriptions: any[] = []
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const params: any = { status: 'active', limit: 100, expand: ['data.discount'] }
      if (startingAfter) params.starting_after = startingAfter
      const batch = await stripe.subscriptions.list(params)
      subscriptions.push(...batch.data)
      hasMore = batch.has_more
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id
      }
    }

    // Also fetch trialing subscriptions
    let hasMore2 = true
    let startingAfter2: string | undefined
    while (hasMore2) {
      const params: any = { status: 'trialing', limit: 100, expand: ['data.discount'] }
      if (startingAfter2) params.starting_after = startingAfter2
      const batch = await stripe.subscriptions.list(params)
      subscriptions.push(...batch.data)
      hasMore2 = batch.has_more
      if (batch.data.length > 0) {
        startingAfter2 = batch.data[batch.data.length - 1].id
      }
    }

    // Categorize subscriptions
    const paying: any[] = []
    const free: any[] = []

    for (const sub of subscriptions) {
      const userId = sub.metadata?.user_id
      const type = sub.metadata?.type || 'unknown'
      
      // Calculate actual monthly amount after discount
      let monthlyAmount = 0
      for (const item of sub.items.data) {
        const unitAmount = item.price?.unit_amount || 0
        const quantity = item.quantity || 1
        // Normalize to monthly
        const interval = item.price?.recurring?.interval
        const intervalCount = item.price?.recurring?.interval_count || 1
        if (interval === 'month') {
          monthlyAmount += (unitAmount * quantity) / intervalCount
        } else if (interval === 'year') {
          monthlyAmount += (unitAmount * quantity) / (12 * intervalCount)
        }
      }

      // Check for discount/coupon
      let discountPercent = 0
      let couponName = ''
      if (sub.discount?.coupon) {
        const coupon = sub.discount.coupon
        couponName = coupon.name || coupon.id || ''
        if (coupon.percent_off) {
          discountPercent = coupon.percent_off
        } else if (coupon.amount_off) {
          // amount_off is in cents
          discountPercent = Math.min(100, (coupon.amount_off / monthlyAmount) * 100)
        }
      }

      const effectiveMonthly = Math.round(monthlyAmount * (1 - discountPercent / 100))

      const entry = {
        subscription_id: sub.id,
        user_id: userId,
        type,
        status: sub.status,
        monthly_amount: effectiveMonthly, // in cents
        original_amount: monthlyAmount, // in cents
        discount_percent: discountPercent,
        coupon_name: couponName,
        customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
      }

      if (effectiveMonthly === 0) {
        free.push(entry)
      } else {
        paying.push(entry)
      }
    }

    // Get profile info for the user_ids
    const allUserIds = [...paying, ...free].map(s => s.user_id).filter(Boolean)
    let userProfiles: Record<string, any> = {}
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allUserIds)
      if (profiles) {
        for (const p of profiles) {
          userProfiles[p.id] = p
        }
      }
    }

    // Enrich entries with profile data
    const enrichEntry = (entry: any) => ({
      ...entry,
      full_name: userProfiles[entry.user_id]?.full_name || null,
      email: userProfiles[entry.user_id]?.email || null,
    })

    const totalMonthlyRevenue = paying.reduce((sum, s) => sum + s.monthly_amount, 0)

    return NextResponse.json({
      paying: paying.map(enrichEntry),
      free: free.map(enrichEntry),
      total_paying: paying.length,
      total_free: free.length,
      total_monthly_revenue_cents: totalMonthlyRevenue,
    })
  } catch (error: any) {
    console.error('Admin billing summary error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
