// ─────────────────────────────────────────────────────────────────────────────
// lib/services/activation.ts
// Rastreo de activación del usuario y detección de intención premium.
// Usa Prisma — solo para server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import {
  ACTIVATION_REQUIREMENTS,
  PLAN_CODES,
  type ActivationEvent,
} from '@/lib/plans'
import { captureServerEvent } from '@/lib/posthog/server'

// ── Return types ──────────────────────────────────────────────────────────────

export type ActivationStatus = {
  userId: string
  score: number
  onboardingCompleted: boolean
  firstTransactionAt: Date | null
  firstGoalAt: Date | null
  firstDebtAt: Date | null
}

// ── getActivationStatus ───────────────────────────────────────────────────────

/**
 * Returns the activation record for userId, creating it if absent.
 */
export async function getActivationStatus(userId: string): Promise<ActivationStatus> {
  const record = await prisma.userActivation.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  })

  return {
    userId:              record.userId,
    score:               record.activationScore,
    onboardingCompleted: record.onboardingCompleted,
    firstTransactionAt:  record.firstTransactionAt,
    firstGoalAt:         record.firstGoalAt,
    firstDebtAt:         record.firstDebtAt,
  }
}

// ── detectUserActivation ──────────────────────────────────────────────────────

/**
 * Records a one-time activation milestone and increments the score.
 * Idempotent — calling twice for the same event has no effect.
 */
export async function detectUserActivation(
  userId: string,
  event: ActivationEvent,
): Promise<void> {
  const req = ACTIVATION_REQUIREMENTS[event]
  const now = new Date()

  // Ensure record exists
  const record = await prisma.userActivation.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  })

  // Idempotency checks — skip if already recorded
  switch (event) {
    case 'FIRST_TRANSACTION': {
      if (record.firstTransactionAt) return
      await prisma.userActivation.update({
        where: { userId },
        data:  {
          firstTransactionAt: now,
          activationScore:    { increment: req.score },
          updatedAt:          now,
        },
      })
      break
    }
    case 'FIRST_GOAL': {
      if (record.firstGoalAt) return
      await prisma.userActivation.update({
        where: { userId },
        data:  {
          firstGoalAt:     now,
          activationScore: { increment: req.score },
          updatedAt:       now,
        },
      })
      break
    }
    case 'FIRST_DEBT': {
      if (record.firstDebtAt) return
      await prisma.userActivation.update({
        where: { userId },
        data:  {
          firstDebtAt:     now,
          activationScore: { increment: req.score },
          updatedAt:       now,
        },
      })
      break
    }
    case 'ONBOARDING_COMPLETE': {
      if (record.onboardingCompleted) return
      await prisma.userActivation.update({
        where: { userId },
        data:  {
          onboardingCompleted:   true,
          onboardingCompletedAt: now,
          activationScore:       { increment: req.score },
          updatedAt:             now,
        },
      })
      break
    }
  }

  captureServerEvent(userId, `activation_milestone`, {
    event,
    score_added: req.score,
    label:       req.label,
  })
}

// ── detectSecondSession ───────────────────────────────────────────────────────

/**
 * Called on every login.
 * Fires a PostHog event if the user hasn't completed onboarding,
 * enabling lifecycle nudges in the marketing pipeline.
 */
export async function detectSecondSession(userId: string): Promise<void> {
  const record = await prisma.userActivation.findUnique({ where: { userId } })
  if (!record) return

  captureServerEvent(userId, 'user_session', {
    activation_score:      record.activationScore,
    onboarding_completed:  record.onboardingCompleted,
  })

  if (!record.onboardingCompleted) {
    captureServerEvent(userId, 'session_pre_onboarding', {
      activation_score: record.activationScore,
    })
  }
}

// ── detectPremiumIntent ───────────────────────────────────────────────────────

/**
 * Logs a paywall impression when the user hits a Pro-gated feature.
 * Used by analytics to measure conversion intent.
 */
export async function detectPremiumIntent(
  userId: string,
  feature: string,
  planShown: string = PLAN_CODES.PRO,
  sessionId?: string,
): Promise<void> {
  await prisma.paywallImpression.create({
    data: {
      userId,
      feature,
      planShown,
      sessionId: sessionId ?? null,
    },
  })

  captureServerEvent(userId, 'paywall_shown', {
    feature,
    plan_shown: planShown,
    session_id: sessionId,
  })
}

// ── createTrialOffer ──────────────────────────────────────────────────────────

/**
 * Generates a single-use trial offer code for the given plan.
 * The offer code is valid for 7 days.
 * Returns the code string, or null if the plan doesn't exist.
 */
export async function createTrialOffer(
  userId: string,
  planSlug: string = PLAN_CODES.PRO,
  trialDays: number = 14,
): Promise<string | null> {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
  if (!plan) return null

  const suffix    = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const code      = `TRIAL-${suffix}-${Date.now()}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const offer = await prisma.trialOffer.create({
    data: {
      planId:    plan.id,
      code,
      trialDays,
      maxUses:   1,
      expiresAt,
      isActive:  true,
    },
  })

  captureServerEvent(userId, 'trial_offer_created', {
    plan_slug:  planSlug,
    trial_days: trialDays,
    code:       offer.code,
  })

  return offer.code
}
