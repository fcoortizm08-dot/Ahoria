// ─────────────────────────────────────────────────────────────────────────────
// lib/flags.ts
// Feature flags leídos desde process.env en runtime.
// Defaults seguros: billing=false, pro_only features=true.
//
// Para habilitar un flag en .env.local:
//   BILLING_ENABLED=true
//   TRIAL_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────

function boolFlag(envKey: string, defaultValue: boolean): boolean {
  const val = process.env[envKey]
  if (val === undefined || val === '') return defaultValue
  return val === '1' || val.toLowerCase() === 'true'
}

export const FLAGS = {
  /** Habilita todo el flujo de billing (planes, suscripciones, pagos). */
  BILLING_ENABLED:     boolFlag('BILLING_ENABLED',     false),

  /** Habilita la creación de trials para nuevos usuarios. */
  TRIAL_ENABLED:       boolFlag('TRIAL_ENABLED',       false),

  /** Habilita el paywall — muestra upgrade prompt al tocar features Pro. */
  PAYWALL_ENABLED:     boolFlag('PAYWALL_ENABLED',     false),

  /** El asistente IA es exclusivo de plan Pro. */
  ASSISTANT_PRO_ONLY:  boolFlag('ASSISTANT_PRO_ONLY',  true),

  /** Los reportes avanzados son exclusivos de plan Pro. */
  REPORTS_PRO_ONLY:    boolFlag('REPORTS_PRO_ONLY',    true),

  /** Los insights automáticos son exclusivos de plan Pro. */
  INSIGHTS_PRO_ONLY:   boolFlag('INSIGHTS_PRO_ONLY',   true),

  /** Las proyecciones financieras son exclusivas de plan Pro. */
  PROJECTION_PRO_ONLY: boolFlag('PROJECTION_PRO_ONLY', true),
} as const

export type FlagKey = keyof typeof FLAGS
