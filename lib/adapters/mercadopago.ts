// ─────────────────────────────────────────────────────────────────────────────
// lib/adapters/mercadopago.ts
// Funciones puras de I/O contra la API de MercadoPago.
// Sin lógica de negocio — solo traduce entre MP y nuestros tipos.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes'
import type { SubscriptionStatus } from '@/lib/plans'

// ── Singleton cliente ─────────────────────────────────────────────────────────

function requireAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN not configured')
  return token
}

export function getMpClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: requireAccessToken() })
}

// ── createMpSubscription ──────────────────────────────────────────────────────

export type CreateMpSubscriptionParams = {
  preapprovalPlanId: string
  payerEmail:        string
  userId:            string   // stored as external_reference
  backUrl:           string
}

export type CreateMpSubscriptionResult = {
  initPoint:     string
  preapprovalId: string
}

export async function createMpSubscription(
  params: CreateMpSubscriptionParams,
): Promise<CreateMpSubscriptionResult> {
  const client      = getMpClient()
  const preApproval = new PreApproval(client)

  const response = await preApproval.create({
    body: {
      preapproval_plan_id: params.preapprovalPlanId,
      payer_email:         params.payerEmail,
      external_reference:  params.userId,
      back_url:            params.backUrl,
    },
  })

  const initPoint     = response.init_point
  const preapprovalId = response.id

  if (!initPoint || !preapprovalId) {
    throw new Error('MP returned incomplete preapproval response')
  }

  return { initPoint, preapprovalId }
}

// ── getMpSubscription ─────────────────────────────────────────────────────────

export async function getMpSubscription(
  preapprovalId: string,
): Promise<PreApprovalResponse> {
  const client      = getMpClient()
  const preApproval = new PreApproval(client)
  return preApproval.get({ id: preapprovalId })
}

// ── cancelMpSubscription ──────────────────────────────────────────────────────

export async function cancelMpSubscription(preapprovalId: string): Promise<void> {
  const client      = getMpClient()
  const preApproval = new PreApproval(client)
  await preApproval.update({ id: preapprovalId, body: { status: 'cancelled' } })
}

// ── verifyMpWebhookSignature ──────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature that MercadoPago sends in x-signature.
 *
 * x-signature format: "ts=1704067200;v1=<hex>"
 * manifest:           "id:<dataId>;request-id:<xRequestId>;ts:<ts>;"
 */
export function verifyMpWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId:     string,
  secret:     string,
): boolean {
  try {
    const parts: Record<string, string> = {}
    xSignature.split(';').forEach((part) => {
      const [k, v] = part.split('=')
      if (k && v) parts[k.trim()] = v.trim()
    })

    const ts = parts['ts']
    const v1 = parts['v1']
    if (!ts || !v1) return false

    const manifest  = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const expected  = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(v1,       'hex'),
    )
  } catch {
    return false
  }
}

// ── mapMpStatusToInternal ─────────────────────────────────────────────────────

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  authorized: 'active',
  paused:     'past_due',
  cancelled:  'canceled',
  pending:    'trialing',
  expired:    'expired',
}

export function mapMpStatusToInternal(mpStatus: string): SubscriptionStatus {
  return STATUS_MAP[mpStatus] ?? 'expired'
}
