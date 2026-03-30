import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  name:          z.string().min(1).optional(),
  target_amount: z.number().positive().optional(),
  target_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon:          z.string().optional(),
  color:         z.string().optional(),
  status:        z.enum(['active', 'completed', 'paused']).optional(),
})

const ContributeSchema = z.object({
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

    const { data: goal, error } = await supabase
      .from('goals')
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

    return NextResponse.json({ goal })
  } catch (err) {
    console.error('[PUT /api/goals/[id]]', err)
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
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/goals/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH: register a contribution — adds amount to current_amount
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = ContributeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    // Fetch current goal
    const { data: existing, error: fetchError } = await supabase
      .from('goals')
      .select('current_amount, target_amount')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      throw fetchError
    }

    const newAmount = (existing.current_amount ?? 0) + parsed.data.amount
    const isComplete = newAmount >= existing.target_amount

    const { data: goal, error } = await supabase
      .from('goals')
      .update({
        current_amount: newAmount,
        status:         isComplete ? 'completed' : 'active',
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ goal, completed: isComplete })
  } catch (err) {
    console.error('[PATCH /api/goals/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
