// ─────────────────────────────────────────────────────────────────────────────
// lib/services/billing.ts
// Lógica de dominio de billing: checkout, sync y cancelación.
// Orquesta el adapter de MercadoPago + Prisma.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { PLAN_CODES } from '@/lib/plans'
import { FLAGS } from '@/lib/flags'
import {
  createMpSubscription,
  getMpSubscription,
  cancelMpSubscription,
  mapMpStatusToInternal,
} from '@/lib/adapters/mercadopago'
import { captureServerEvent } from '@/lib/posthog/server'
import { EVENTS } from '@/lib/posthog/events'
import { sendEmail } from '@/lib/resend/client'

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchUserEmail(userId: string): Promise<string | null> {
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return null
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data } = await admin.auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

// ── createCheckout ────────────────────────────────────────────────────────────

export type CreateCheckoutResult = {
  checkoutUrl: string
}

/**
 * Starts a Pro subscription checkout via MercadoPago.
 * Creates a Subscription record with status='trialing' and the MP preapproval ID.
 */
export async function createCheckout(
  userId:  string,
  email:   string,
  baseUrl: string,
): Promise<CreateCheckoutResult> {
  if (!FLAGS.BILLING_ENABLED) {
    throw new Error('Billing is not enabled')
  }

  const planId = process.env.MP_PLAN_ID
  if (!planId) throw new Error('MP_PLAN_ID not configured')

  const proPlan = await prisma.plan.findUnique({ where: { slug: PLAN_CODES.PRO } })
  if (!proPlan) throw new Error('Pro plan not found in database — run seed first')

  const backUrl = `${baseUrl}/dashboard`

  const { initPoint, preapprovalId } = await createMpSubscription({
    preapprovalPlanId: planId,
    payerEmail:        email,
    userId,
    backUrl,
  })

  const now      = new Date()
  const trialEnd = new Date(now)
  trialEnd.setDate(trialEnd.getDate() + proPlan.trialDays)

  await prisma.subscription.create({
    data: {
      userId,
      planId:              proPlan.id,
      status:              'trialing',
      currentPeriodStart:  now,
      currentPeriodEnd:    trialEnd,
      trialStart:          now,
      trialEnd,
      mpSubscriptionId:    preapprovalId,
      mpPreapprovalId:     planId,
    },
  })

  captureServerEvent(userId, EVENTS.CHECKOUT_STARTED, {
    plan:          PLAN_CODES.PRO,
    preapproval_id: preapprovalId,
  })

  return { checkoutUrl: initPoint }
}

// ── syncSubscription ──────────────────────────────────────────────────────────

/**
 * Pulls latest status from MP and syncs the Subscription record in Prisma.
 * Fires PostHog events when status changes to active / canceled / past_due.
 */
export async function syncSubscription(
  mpSubscriptionId: string,
  userId:           string,
): Promise<void> {
  const mpSub    = await getMpSubscription(mpSubscriptionId)
  const newStatus = mapMpStatusToInternal(mpSub.status ?? 'expired')

  const subscription = await prisma.subscription.findFirst({
    where: { mpSubscriptionId },
  })

  if (!subscription) {
    console.warn('[syncSubscription] No local subscription found for', mpSubscriptionId)
    return
  }

  const prevStatus = subscription.status

  const now = new Date()
  await prisma.subscription.update({
    where: { id: subscription.id },
    data:  {
      status:    newStatus,
      updatedAt: now,
    },
  })

  // PostHog events + emails on status transitions
  if (prevStatus !== newStatus) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const emailData = {
      dashboardUrl: `${appUrl}/dashboard`,
      billingUrl:   `${appUrl}/billing`,
      upgradeUrl:   `${appUrl}/upgrade`,
    }

    if (newStatus === 'active') {
      captureServerEvent(userId, EVENTS.SUBSCRIPTION_ACTIVATED, {
        plan: PLAN_CODES.PRO,
        mp_subscription_id: mpSubscriptionId,
      })
      // fire-and-forget email
      fetchUserEmail(userId).then((email) => {
        if (email) {
          sendEmail({ to: email, userId, template: 'subscription_activated', data: emailData })
            .catch((err) => console.error('[syncSubscription] email subscription_activated:', err))
        }
      }).catch(() => {})
    } else if (newStatus === 'canceled') {
      captureServerEvent(userId, EVENTS.SUBSCRIPTION_CANCELED, {
        plan:        PLAN_CODES.PRO,
        prev_status: prevStatus,
      })
      fetchUserEmail(userId).then((email) => {
        if (email) {
          const periodEnd = subscription.currentPeriodEnd
            ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                .format(subscription.currentPeriodEnd)
            : undefined
          sendEmail({ to: email, userId, template: 'subscription_canceled', data: { ...emailData, periodEnd } })
            .catch((err) => console.error('[syncSubscription] email subscription_canceled:', err))
        }
      }).catch(() => {})
    } else if (newStatus === 'past_due') {
      captureServerEvent(userId, EVENTS.PAYMENT_FAILED, {
        plan:        PLAN_CODES.PRO,
        prev_status: prevStatus,
      })
      fetchUserEmail(userId).then((email) => {
        if (email) {
          sendEmail({ to: email, userId, template: 'payment_failed', data: emailData })
            .catch((err) => console.error('[syncSubscription] email payment_failed:', err))
        }
      }).catch(() => {})
    }
  }
}

// ── cancelSubscription ────────────────────────────────────────────────────────

/**
 * Cancels the user's active MP subscription and updates Prisma.
 * Throws if no cancellable subscription is found.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      mpSubscriptionId: { not: null },
      status: { in: ['active', 'trialing', 'past_due'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription?.mpSubscriptionId) {
    throw new Error('No active MP subscription to cancel')
  }

  await cancelMpSubscription(subscription.mpSubscriptionId)

  const now = new Date()

  await prisma.subscription.update({
    where: { id: subscription.id },
    data:  {
      status:     'canceled',
      canceledAt: now,
      updatedAt:  now,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:     'subscription.canceled',
      entityType: 'subscription',
      entityId:   subscription.id,
      before:     { status: subscription.status } as object,
      after:      { status: 'canceled' } as object,
    },
  })

  captureServerEvent(userId, EVENTS.SUBSCRIPTION_CANCELED, {
    plan:              PLAN_CODES.PRO,
    mp_subscription_id: subscription.mpSubscriptionId,
  })
}
