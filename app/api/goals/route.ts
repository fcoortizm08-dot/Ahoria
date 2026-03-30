import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/services/entitlements'
import { detectUserActivation, detectPremiumIntent } from '@/lib/services/activation'
import { FEATURE_KEYS } from '@/lib/plans'

const GoalSchema = z.object({
  name:          z.string().min(1),
  target_amount: z.number().positive(),
  target_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  icon:          z.string().optional().default('🎯'),
  color:         z.string().optional().default('#8b5cf6'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('target_date', { ascending: true })

    if (error) throw error

    return NextResponse.json({ goals: data ?? [] })
  } catch (err) {
    console.error('[GET /api/goals]', err)
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

    // Count active goals for limit check
    const { count, error: countError } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (countError) throw countError

    const limitResult = await checkLimit(
      user.id,
      FEATURE_KEYS.MAX_GOALS,
      count ?? 0,
    )

    if (!limitResult.allowed) {
      // Log premium intent (fire-and-forget)
      detectPremiumIntent(user.id, FEATURE_KEYS.MAX_GOALS).catch(() => {})

      return NextResponse.json(
        {
          error:   'limit_reached',
          feature: FEATURE_KEYS.MAX_GOALS,
          limit:   limitResult.limit,
          current: limitResult.current,
        },
        { status: 403 },
      )
    }

    const body: unknown = await request.json()
    const parsed = GoalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({ ...parsed.data, user_id: user.id, status: 'active', current_amount: 0 })
      .select('*')
      .single()

    if (error) throw error

    detectUserActivation(user.id, 'FIRST_GOAL').catch((err) =>
      console.error('[POST /api/goals] activation:', err),
    )

    return NextResponse.json({ goal }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/goals]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
