import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { statusHasProAccess, PLAN_CODES } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'trialing', 'past_due', 'canceled'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return NextResponse.json({
        plan:             PLAN_CODES.FREE,
        planName:         'Free',
        status:           'active',
        isProAccess:      false,
        trialEnd:         null,
        currentPeriodEnd: null,
        canceledAt:       null,
      })
    }

    const isPro =
      statusHasProAccess(subscription.status) &&
      subscription.plan.slug !== PLAN_CODES.FREE

    return NextResponse.json({
      plan:             subscription.plan.slug,
      planName:         subscription.plan.name,
      status:           subscription.status,
      isProAccess:      isPro,
      trialEnd:         subscription.trialEnd?.toISOString()         ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      canceledAt:       subscription.canceledAt?.toISOString()       ?? null,
    })
  } catch (err) {
    console.error('[GET /api/me/subscription]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
