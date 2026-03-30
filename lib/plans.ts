// ─────────────────────────────────────────────────────────────────────────────
// lib/plans.ts
// Constantes de negocio para planes, features y activación.
// Nada de esto debe hardcodearse en componentes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Feature keys ─────────────────────────────────────────────────────────────

export const FEATURE_KEYS = {
  MAX_TRANSACTIONS_MONTH: 'max_transactions_month',
  MAX_GOALS:              'max_goals',
  MAX_DEBTS:              'max_debts',
  CATEGORIES_CUSTOM:      'categories_custom',
  EXPORT_CSV:             'export_csv',
  ADVANCED_ANALYTICS:     'advanced_analytics',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

// ── Plan codes ────────────────────────────────────────────────────────────────

export const PLAN_CODES = {
  FREE: 'free',
  PRO:  'pro',
} as const

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES]

// ── Subscription statuses ─────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUS = {
  TRIALING:  'trialing',
  ACTIVE:    'active',
  PAST_DUE:  'past_due',
  CANCELED:  'canceled',
  EXPIRED:   'expired',
} as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

/**
 * Returns true if the given subscription status grants Pro-level access.
 * past_due gets a grace period — access stays open until explicitly revoked.
 */
export function statusHasProAccess(status: string): boolean {
  return (
    status === SUBSCRIPTION_STATUS.TRIALING ||
    status === SUBSCRIPTION_STATUS.ACTIVE   ||
    status === SUBSCRIPTION_STATUS.PAST_DUE
  )
}

// ── Trial ─────────────────────────────────────────────────────────────────────

export const TRIAL_DURATION_DAYS = 14

// ── Activation milestones ─────────────────────────────────────────────────────
// Each key maps to a UserActivation event. Score adds up to 100.

export const ACTIVATION_REQUIREMENTS = {
  FIRST_TRANSACTION:  { score: 25, label: 'Primera transacción registrada' },
  FIRST_GOAL:         { score: 25, label: 'Primera meta creada' },
  FIRST_DEBT:         { score: 20, label: 'Primera deuda registrada' },
  ONBOARDING_COMPLETE:{ score: 30, label: 'Onboarding completado' },
} as const

export type ActivationEvent = keyof typeof ACTIVATION_REQUIREMENTS

// ── Pricing ───────────────────────────────────────────────────────────────────

export const PRICING = {
  [PLAN_CODES.FREE]: {
    clp:          0,
    usd:          0,
    label:        'Free',
    billingCycle: 'monthly' as const,
  },
  [PLAN_CODES.PRO]: {
    clp:          4990,
    usd:          4.99,
    label:        'Pro',
    billingCycle: 'monthly' as const,
  },
} as const satisfies Record<PlanCode, { clp: number; usd: number; label: string; billingCycle: 'monthly' | 'annual' }>

// ── Feature limits (Free defaults) ───────────────────────────────────────────
// Used as fallback when no DB record is found.

export const FREE_DEFAULTS: Record<FeatureKey, string> = {
  [FEATURE_KEYS.MAX_TRANSACTIONS_MONTH]: '50',
  [FEATURE_KEYS.MAX_GOALS]:              '2',
  [FEATURE_KEYS.MAX_DEBTS]:              '2',
  [FEATURE_KEYS.CATEGORIES_CUSTOM]:      '3',
  [FEATURE_KEYS.EXPORT_CSV]:             'false',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]:     'false',
}
