import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan, getUserEntitlements } from '@/lib/services/entitlements'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [userPlan, features] = await Promise.all([
      getUserPlan(user.id),
      getUserEntitlements(user.id),
    ])

    return NextResponse.json({
      plan:        userPlan.planSlug,
      status:      userPlan.subscriptionStatus,
      isProAccess: userPlan.isPro,
      trialEnd:    userPlan.trialEnd,
      features,
    })
  } catch (err) {
    console.error('[GET /api/me/entitlements]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
