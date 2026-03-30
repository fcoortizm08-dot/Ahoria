// ─────────────────────────────────────────────────────────────────────────────
// lib/posthog/events.ts
// Catálogo canónico de eventos PostHog.
// Importar desde aquí en lugar de usar strings literales.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENTS = {
  // ── Auth & onboarding ──────────────────────────────────────────────────────
  SIGNUP_COMPLETED:         'signup_completed',
  ONBOARDING_STARTED:       'onboarding_started',

  // ── Transacciones ──────────────────────────────────────────────────────────
  INCOME_CREATED:           'income_created',
  EXPENSE_CREATED:          'expense_created',

  // ── Navegación ────────────────────────────────────────────────────────────
  DASHBOARD_VIEWED:         'dashboard_viewed',

  // ── Activación ────────────────────────────────────────────────────────────
  USER_ACTIVATED:           'user_activated',
  SECOND_SESSION_DETECTED:  'second_session_detected',
  ACTIVATION_MILESTONE:     'activation_milestone',

  // ── Paywall ───────────────────────────────────────────────────────────────
  PREMIUM_FEATURE_VIEWED:   'premium_feature_viewed',
  PAYWALL_VIEWED:           'paywall_viewed',
  TRIAL_OFFER_SHOWN:        'trial_offer_shown',

  // ── Trial ─────────────────────────────────────────────────────────────────
  TRIAL_STARTED:            'trial_started',

  // ── Checkout & billing ────────────────────────────────────────────────────
  CHECKOUT_STARTED:         'checkout_started',
  CHECKOUT_COMPLETED:       'checkout_completed',
  SUBSCRIPTION_ACTIVATED:   'subscription_activated',
  SUBSCRIPTION_CANCELED:    'subscription_canceled',
  RENEWAL_SUCCEEDED:        'renewal_succeeded',
  RENEWAL_FAILED:           'renewal_failed',
  PAYMENT_FAILED:           'payment_failed',

  // ── Gating ────────────────────────────────────────────────────────────────
  FEATURE_BLOCKED_FREE_LIMIT: 'feature_blocked_free_limit',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
