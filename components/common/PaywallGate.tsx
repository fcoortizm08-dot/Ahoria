'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { FeatureKey } from '@/lib/plans'

// ── Descriptores por feature ──────────────────────────────────────────────────

const FEATURE_DESCRIPTIONS: Partial<Record<FeatureKey, string>> = {
  max_transactions_month: 'Registra transacciones ilimitadas cada mes.',
  max_goals:              'Crea y gestiona todas las metas que necesites.',
  max_debts:              'Registra y da seguimiento a todas tus deudas.',
  export_csv:             'Exporta tus datos a Excel o Google Sheets.',
  advanced_analytics:     'Accede a reportes avanzados y proyecciones financieras.',
  categories_custom:      'Crea categorías personalizadas ilimitadas.',
}

const FEATURE_TITLES: Partial<Record<FeatureKey, string>> = {
  max_transactions_month: 'Transacciones ilimitadas',
  max_goals:              'Metas ilimitadas',
  max_debts:              'Deudas ilimitadas',
  export_csv:             'Exportar datos',
  advanced_analytics:     'Analítica avanzada',
  categories_custom:      'Categorías personalizadas',
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  featureKey: FeatureKey
  children:   React.ReactNode
  fallback?:  React.ReactNode
}

// ── PaywallGate ───────────────────────────────────────────────────────────────

export function PaywallGate({ featureKey, children, fallback }: Props) {
  const { isLoading, canAccess } = useEntitlements()
  const hasFiredRef = useRef(false)

  const hasAccess = canAccess(featureKey)

  // Fire premium intent impression once when gate is shown
  useEffect(() => {
    if (!isLoading && !hasAccess && !hasFiredRef.current) {
      hasFiredRef.current = true
      fetch('/api/me/premium-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ feature: featureKey }),
      }).catch(() => {
        // Endpoint may not exist yet — fail silently
      })
    }
  }, [isLoading, hasAccess, featureKey])

  // While loading, render nothing to avoid layout flash
  if (isLoading) return null

  if (hasAccess) return <>{children}</>

  // Explicit fallback provided by caller
  if (fallback) return <>{fallback}</>

  // Default lock block — no dark patterns
  const title       = FEATURE_TITLES[featureKey]       ?? 'Función Pro'
  const description = FEATURE_DESCRIPTIONS[featureKey] ?? 'Esta función está disponible en el plan Pro.'

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1e2d45] bg-[#0d1117] px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-2xl">
        🔒
      </div>
      <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
      <p className="mb-5 max-w-xs text-xs text-slate-500">{description}</p>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        Ver planes
      </Link>
    </div>
  )
}
