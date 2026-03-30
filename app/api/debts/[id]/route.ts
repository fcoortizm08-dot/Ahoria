import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  name:            z.string().min(1).optional(),
  total_amount:    z.number().positive().optional(),
  current_balance: z.number().min(0).optional(),
  interest_rate:   z.number().min(0).optional(),
  minimum_payment: z.number().min(0).optional(),
  due_day:         z.number().int().min(1).max(31).optional().nullable(),
  status:          z.enum(['active', 'paid']).optional(),
})

const PaymentSchema = z.object({
  amount: z.number().positive(),
})

type Params = Promise<{ id: string }>

export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { data: debt, error } = await supabase
      .from('debts')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ debt })
  } catch (err) {
    console.error('[PUT /api/debts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/debts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH: register payment — decrements current_balance, marks paid if reaches 0
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = PaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { data: existing, error: fetchError } = await supabase
      .from('debts')
      .select('current_balance')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      throw fetchError
    }

    const newBalance = Math.max(0, (existing.current_balance ?? 0) - parsed.data.amount)
    const isPaid     = newBalance === 0

    const { data: debt, error } = await supabase
      .from('debts')
      .update({
        current_balance: newBalance,
        status:          isPaid ? 'paid' : 'active',
        updated_at:      new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ debt, paid: isPaid })
  } catch (err) {
    console.error('[PATCH /api/debts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
