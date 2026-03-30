import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  type:          z.enum(['income', 'expense']).optional(),
  amount:        z.number().positive().optional(),
  description:   z.string().min(1).optional(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category_id:   z.string().uuid().optional().nullable(),
  is_recurring:  z.boolean().optional(),
  recurring_day: z.number().int().min(1).max(31).optional().nullable(),
  notes:         z.string().optional().nullable(),
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

    const { data: tx, error } = await supabase
      .from('transactions')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)   // ownership check via RLS + explicit filter
      .is('deleted_at', null)
      .select('*, category:categories(*)')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ transaction: tx })
  } catch (err) {
    console.error('[PUT /api/transactions/[id]]', err)
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
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/transactions/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
