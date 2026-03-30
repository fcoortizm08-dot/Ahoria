import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createCheckout } from '@/lib/services/billing'
import { FLAGS } from '@/lib/flags'

const BodySchema = z.object({
  returnUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!FLAGS.BILLING_ENABLED) {
      return NextResponse.json(
        {
          error:   'billing_disabled',
          message: 'El sistema de pagos está temporalmente deshabilitado. Únete a la lista de espera en /upgrade.',
        },
        { status: 503 },
      )
    }

    const body: unknown = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const email     = user.email ?? ''
    const { checkoutUrl } = await createCheckout(user.id, email, appUrl)

    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('[POST /api/billing/mercado-pago/checkout]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
