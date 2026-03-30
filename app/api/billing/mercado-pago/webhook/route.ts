import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyMpWebhookSignature } from '@/lib/adapters/mercadopago'
import { syncSubscription } from '@/lib/services/billing'

const MpWebhookSchema = z.object({
  action:       z.string(),
  type:         z.string(),
  data:         z.object({ id: z.string() }).optional(),
  date_created: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const rawBody    = await request.text()
    const xSignature = request.headers.get('x-signature') ?? ''
    const xRequestId = request.headers.get('x-request-id') ?? ''

    // ── Signature verification ──────────────────────────────────────────────
    const secret = process.env.MP_WEBHOOK_SECRET
    if (secret) {
      // Extract data.id from raw body for signature (pre-parse)
      let dataId = ''
      try {
        const preview = JSON.parse(rawBody) as { data?: { id?: string } }
        dataId = preview.data?.id ?? ''
      } catch {
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
      }

      const valid = verifyMpWebhookSignature(xSignature, xRequestId, dataId, secret)
      if (!valid) {
        console.warn('[webhook] Invalid MP signature')
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    // ── Parse webhook payload ───────────────────────────────────────────────
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const parsed = MpWebhookSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ received: true, skipped: 'unknown_schema' })
    }

    const { action, type, data, date_created } = parsed.data
    const dataId = data?.id ?? ''

    // ── Idempotency ──────────────────────────────────────────────────────────
    const providerEventId = `${action}-${dataId}-${date_created ?? ''}`

    const duplicate = await prisma.subscriptionEvent.findFirst({
      where: {
        payload: {
          path:   ['providerEventId'],
          equals: providerEventId,
        },
      },
    })

    if (duplicate) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // ── Handle subscription events ───────────────────────────────────────────
    if (type === 'subscription_preapproval' && dataId) {
      // Fetch the preapproval to get the external_reference (userId)
      const { getMpSubscription } = await import('@/lib/adapters/mercadopago')
      const mpSub = await getMpSubscription(dataId)
      const userId = mpSub.external_reference

      if (!userId) {
        console.warn('[webhook] No external_reference in MP subscription', dataId)
        return NextResponse.json({ received: true, skipped: 'no_user' })
      }

      // Find the local subscription to create the event record
      const subscription = await prisma.subscription.findFirst({
        where: { mpSubscriptionId: dataId },
      })

      if (subscription) {
        await prisma.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            eventType:      action,
            payload: {
              providerEventId,
              action,
              type,
              dataId,
              date_created,
              rawPayload: payload,
            } as object,
          },
        })
      }

      await syncSubscription(dataId, userId)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[POST /api/billing/mercado-pago/webhook]', err)
    // Return 200 to prevent MP from retrying on transient errors
    return NextResponse.json({ received: true, error: 'internal' })
  }
}
