import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/services/billing'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await cancelSubscription(user.id)

    return NextResponse.json({ canceled: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'No active MP subscription to cancel') {
      return NextResponse.json(
        { error: 'no_active_subscription', message: 'No tienes una suscripción activa para cancelar.' },
        { status: 400 },
      )
    }
    console.error('[POST /api/billing/cancel]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
