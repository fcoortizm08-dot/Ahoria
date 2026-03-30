import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { detectUserActivation } from '@/lib/services/activation'

const TransactionSchema = z.object({
  type:        z.enum(['income', 'expense']),
  amount:      z.number().positive(),
  description: z.string().min(1),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  category_id: z.string().uuid().optional().nullable(),
  is_recurring:  z.boolean().optional().default(false),
  recurring_day: z.number().int().min(1).max(31).optional().nullable(),
  notes:         z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end   = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ transactions: data ?? [] })
  } catch (err) {
    console.error('[GET /api/transactions]', err)
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

    const body: unknown = await request.json()
    const parsed = TransactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({ ...parsed.data, user_id: user.id })
      .select('*, category:categories(*)')
      .single()

    if (error) throw error

    // Fire activation milestone (idempotent — only scores once per user)
    detectUserActivation(user.id, 'FIRST_TRANSACTION').catch((err) =>
      console.error('[POST /api/transactions] activation:', err),
    )

    return NextResponse.json({ transaction: tx }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/transactions]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
