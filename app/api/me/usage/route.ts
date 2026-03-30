import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getActivationStatus } from '@/lib/services/activation'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const today = new Date()

    const [activation, counters] = await Promise.all([
      getActivationStatus(user.id),
      prisma.usageCounter.findMany({
        where: {
          userId:      user.id,
          periodStart: { lte: today },
          periodEnd:   { gte: today },
        },
      }),
    ])

    const usage: Record<string, number> = {}
    for (const c of counters) {
      usage[c.counterKey] = Number(c.value)
    }

    return NextResponse.json({
      activation: {
        score:               activation.score,
        onboardingCompleted: activation.onboardingCompleted,
        firstTransactionAt:  activation.firstTransactionAt,
        firstGoalAt:         activation.firstGoalAt,
        firstDebtAt:         activation.firstDebtAt,
      },
      usage,
    })
  } catch (err) {
    console.error('[GET /api/me/usage]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
