-- Migration: init_billing
-- AHORIA billing & analytics tables
-- Applied: 2026-03-29

-- ── plans ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  price_clp     BIGINT      NOT NULL DEFAULT 0,
  price_usd     DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT        NOT NULL DEFAULT 'monthly'
                            CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_days    INT         NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  metadata      JSON,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── plan_features ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_features (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- ── subscriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profiles(id),
  plan_id              UUID        NOT NULL REFERENCES public.plans(id),
  status               TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  trial_start          TIMESTAMPTZ,
  trial_end            TIMESTAMPTZ,
  canceled_at          TIMESTAMPTZ,
  cancel_reason        TEXT,
  mp_subscription_id   TEXT        UNIQUE,
  mp_preapproval_id    TEXT,
  metadata             JSON,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── subscription_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID        NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  payload         JSON,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── user_activations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES public.profiles(id),
  registered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  onboarding_completed    BOOLEAN     NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  first_transaction_at    TIMESTAMPTZ,
  first_goal_at           TIMESTAMPTZ,
  first_debt_at           TIMESTAMPTZ,
  activation_score        INT         NOT NULL DEFAULT 0
                                      CHECK (activation_score >= 0 AND activation_score <= 100),
  referral_source         TEXT,
  utm_source              TEXT,
  utm_medium              TEXT,
  utm_campaign            TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── usage_counters ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id),
  counter_key  TEXT        NOT NULL,
  value        BIGINT      NOT NULL DEFAULT 0,
  period_start DATE        NOT NULL,
  period_end   DATE        NOT NULL,
  reset_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, counter_key, period_start)
);

-- ── trial_offers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trial_offers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID        NOT NULL REFERENCES public.plans(id),
  code       TEXT        NOT NULL UNIQUE,
  trial_days INT         NOT NULL,
  max_uses   INT,
  used_count INT         NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── paywall_impressions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paywall_impressions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id),
  feature      TEXT        NOT NULL,
  plan_shown   TEXT        NOT NULL,
  converted    BOOLEAN     NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,
  session_id   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── notification_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id),
  channel    TEXT        NOT NULL CHECK (channel IN ('email','push','in_app')),
  type       TEXT        NOT NULL,
  subject    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','sent','failed','bounced')),
  sent_at    TIMESTAMPTZ,
  error      TEXT,
  metadata   JSON,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id),
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  before      JSON,
  after       JSON,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id        ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status         ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_events_subscription_id   ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id       ON public.usage_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_user_id              ON public.paywall_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_id         ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id                ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity                 ON public.audit_logs(entity_type, entity_id);
