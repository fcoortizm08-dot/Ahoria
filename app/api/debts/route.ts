import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/services/entitlements'
import { detectUserActivation, detectPremiumIntent } from '@/lib/services/activation'
import { FEATURE_KEYS } from '@/lib/plans'

const DebtSchema = z.object({
  name:            z.string().min(1),
  total_amount:    z.number().positive(),
  current_balance: z.number().min(0),
  interest_rate:   z.number().min(0).optional().default(0),
  minimum_payment: z.number().min(0).optional().default(0),
  due_day:         z.number().int().min(1).max(31).optional().nullable(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('interest_rate', { ascending: false })

    if (error) throw error

    return NextResponse.json({ debts: data ?? [] })
  } catch (err) {
    console.error('[GET /api/debts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Count active debts for limit check
    const { count, error: countError } = await supabase
      .from('debts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (countError) throw countError

    const limitResult = await checkLimit(
      user.id,
      FEATURE_KEYS.MAX_DEBTS,
      count ?? 0,
    )

    if (!limitResult.allowed) {
      detectPremiumIntent(user.id, FEATURE_KEYS.MAX_DEBTS).catch(() => {})

      return NextResponse.json(
        {
          error:   'limit_reached',
          feature: FEATURE_KEYS.MAX_DEBTS,
          limit:   limitResult.limit,
          current: limitResult.current,
        },
        { status: 403 },
      )
    }

    const body: unknown = await request.json()
    const parsed = DebtSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { data: debt, error } = await supabase
      .from('debts')
      .insert({ ...parsed.data, user_id: user.id, status: 'active' })
      .select('*')
      .single()

    if (error) throw error

    detectUserActivation(user.id, 'FIRST_DEBT').catch((err) =>
      console.error('[POST /api/debts] activation:', err),
    )

    return NextResponse.json({ debt }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/debts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
