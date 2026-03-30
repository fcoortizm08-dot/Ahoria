// ─────────────────────────────────────────────────────────────────────────────
// lib/services/entitlements.ts
// Lógica de permisos y límites de plan.
// Usa Prisma — solo para server-side (Route Handlers, Server Components).
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import {
  FEATURE_KEYS,
  PLAN_CODES,
  FREE_DEFAULTS,
  statusHasProAccess,
  type FeatureKey,
  type PlanCode,
} from '@/lib/plans'

// ── Return types ──────────────────────────────────────────────────────────────

export type Entitlements = Record<FeatureKey, string>

export type UserPlan = {
  planSlug: PlanCode | string
  subscriptionStatus: string
  isPro: boolean
  trialEnd: Date | null
}

export type LimitCheck = {
  allowed: boolean
  current: number
  limit: number | null // null = unlimited
}

// ── getUserPlan ───────────────────────────────────────────────────────────────

/**
 * Returns the user's active subscription and plan.
 * Falls back to Free if no subscription exists.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: [
          'active',
          'trialing',
          'past_due',
        ],
      },
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription) {
    return {
      planSlug:           PLAN_CODES.FREE,
      subscriptionStatus: 'active',
      isPro:              false,
      trialEnd:           null,
    }
  }

  const isPro =
    statusHasProAccess(subscription.status) &&
    subscription.plan.slug !== PLAN_CODES.FREE

  return {
    planSlug:           subscription.plan.slug,
    subscriptionStatus: subscription.status,
    isPro,
    trialEnd:           subscription.trialEnd,
  }
}

// ── getUserEntitlements ───────────────────────────────────────────────────────

/**
 * Returns the full feature map for the user's current plan.
 * Starts from Free defaults and overlays plan_features rows.
 */
export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  const { planSlug } = await getUserPlan(userId)

  const features = await prisma.planFeature.findMany({
    where: { plan: { slug: planSlug } },
  })

  const result: Entitlements = { ...FREE_DEFAULTS }

  for (const f of features) {
    const key = f.featureKey as FeatureKey
    if (key in result) {
      result[key] = f.value
    }
  }

  return result
}

// ── canAccessFeature ──────────────────────────────────────────────────────────

/**
 * Returns true if the user's plan grants access to a boolean feature.
 * ('true' or 'unlimited' → access granted)
 */
export async function canAccessFeature(
  userId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId)
  const value = entitlements[featureKey]
  return value === 'true' || value === 'unlimited'
}

// ── checkLimit ────────────────────────────────────────────────────────────────

/**
 * Compares currentCount against the plan's numeric limit for featureKey.
 * Pass the count already computed by the caller to avoid extra DB round-trips.
 *
 * @param currentCount - number of items the user already has
 */
export async function checkLimit(
  userId: string,
  featureKey: FeatureKey,
  currentCount: number,
): Promise<LimitCheck> {
  const entitlements = await getUserEntitlements(userId)
  const value = entitlements[featureKey]

  if (value === 'unlimited') {
    return { allowed: true, current: currentCount, limit: null }
  }

  const limit = parseInt(value, 10)
  if (isNaN(limit)) {
    return { allowed: true, current: currentCount, limit: null }
  }

  return { allowed: currentCount < limit, current: currentCount, limit }
}

// ── initializeFreeSubscription ────────────────────────────────────────────────

/**
 * Creates a Free subscription for userId if none exists.
 * Idempotent — safe to call on every login.
 * Silently skips if the profile doesn't exist yet (Supabase trigger race).
 */
export async function initializeFreeSubscription(userId: string): Promise<void> {
  // Guard: profile must exist (FK constraint)
  const profile = await prisma.profile.findUnique({ where: { id: userId } })
  if (!profile) return

  const existing = await prisma.subscription.findFirst({ where: { userId } })
  if (existing) return

  const freePlan = await prisma.plan.findUnique({ where: { slug: PLAN_CODES.FREE } })
  if (!freePlan) throw new Error('Free plan not found — run seed first')

  const now = new Date()
  const farFuture = new Date(now)
  farFuture.setFullYear(farFuture.getFullYear() + 100)

  await prisma.subscription.create({
    data: {
      userId,
      planId:              freePlan.id,
      status:              'active',
      currentPeriodStart:  now,
      currentPeriodEnd:    farFuture,
    },
  })
}
