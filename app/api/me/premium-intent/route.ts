import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { detectPremiumIntent } from '@/lib/services/activation'

const BodySchema = z.object({
  featureKey: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    await detectPremiumIntent(user.id, parsed.data.featureKey)

    return NextResponse.json({ recorded: true })
  } catch (err) {
    console.error('[POST /api/me/premium-intent]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
