'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type SubscriptionData = {
  plan:             string
  planName:         string
  status:           string
  isProAccess:      boolean
  trialEnd:         string | null
  currentPeriodEnd: string | null
  canceledAt:       string | null
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#1a2535] ${className ?? ''}`} />
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SkeletonBlock className="h-7 w-40" />
      <div className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-6 space-y-4">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-64" />
        <SkeletonBlock className="h-10 w-40" />
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [data, setData]       = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [confirm, setConfirm] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const fetchSubscription = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/me/subscription')
      const json = await res.json() as SubscriptionData
      setData(json)
    } catch {
      setError('No se pudo cargar tu suscripción.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscription() }, [fetchSubscription])

  const handleCancel = async () => {
    setCanceling(true)
    setCancelError('')
    const res  = await fetch('/api/billing/cancel', { method: 'POST' })
    const json = await res.json() as { canceled?: boolean; message?: string; error?: string }
    if (res.ok) {
      setConfirm(false)
      await fetchSubscription()
    } else {
      setCancelError(json.message ?? json.error ?? 'No se pudo cancelar. Intenta de nuevo.')
    }
    setCanceling(false)
  }

  if (loading) return <LoadingSkeleton />
  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }
  if (!data) return null

  const { status, planName, trialEnd, currentPeriodEnd, canceledAt } = data

  const isFree     = status === 'active' && data.plan === 'free'
  const isTrialing = status === 'trialing'
  const isActive   = status === 'active' && data.plan !== 'free'
  const isPastDue  = status === 'past_due'
  const isCanceled = status === 'canceled'

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-extrabold text-white">Mi suscripción</h1>

      {/* past_due alert */}
      {isPastDue && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-300">Problema con tu pago</p>
          <p className="mt-0.5 text-xs text-amber-400/80">
            No pudimos procesar el último cobro. Actualiza tu método de pago en MercadoPago para mantener el acceso Pro.
          </p>
        </div>
      )}

      {/* main card */}
      <div className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-6">
        {/* Plan badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            isFree
              ? 'bg-slate-700/50 text-slate-400'
              : 'bg-blue-500/20 text-blue-300'
          }`}>
            {planName}
          </span>
          {(isActive || isTrialing) && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Activo
            </span>
          )}
          {isPastDue && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              Pago pendiente
            </span>
          )}
          {isCanceled && (
            <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              Cancelado
            </span>
          )}
        </div>

        {isFree && (
          <>
            <p className="mb-1 text-sm text-slate-400">Estás en el plan gratuito.</p>
            <p className="mb-5 text-xs text-slate-600">
              Actualiza a Pro para desbloquear transacciones ilimitadas, metas, deudas y más.
            </p>
            <Link
              href="/upgrade"
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              Ver plan Pro
            </Link>
          </>
        )}

        {isTrialing && (
          <>
            <p className="mb-1 text-sm text-white font-semibold">Plan Pro — período de prueba</p>
            {trialEnd && (
              <p className="mb-1 text-xs text-slate-500">
                Prueba gratis hasta: <span className="text-slate-300">{formatDate(trialEnd)}</span>
              </p>
            )}
            {currentPeriodEnd && (
              <p className="mb-5 text-xs text-slate-500">
                Primer cobro: <span className="text-slate-300">{formatDate(currentPeriodEnd)}</span>
              </p>
            )}
            <button
              onClick={() => setConfirm(true)}
              className="text-xs text-slate-500 underline hover:text-slate-300 transition"
            >
              Cancelar suscripción
            </button>
          </>
        )}

        {isActive && (
          <>
            <p className="mb-1 text-sm text-white font-semibold">Plan Pro activo</p>
            {currentPeriodEnd && (
              <p className="mb-5 text-xs text-slate-500">
                Próximo cobro: <span className="text-slate-300">{formatDate(currentPeriodEnd)}</span>
              </p>
            )}
            <button
              onClick={() => setConfirm(true)}
              className="text-xs text-slate-500 underline hover:text-slate-300 transition"
            >
              Cancelar suscripción
            </button>
          </>
        )}

        {isPastDue && (
          <>
            <p className="mb-1 text-sm text-white font-semibold">Plan Pro</p>
            <p className="mb-5 text-xs text-slate-500">
              Acceso activo mientras se resuelve el pago.
            </p>
            <button
              onClick={() => setConfirm(true)}
              className="text-xs text-slate-500 underline hover:text-slate-300 transition"
            >
              Cancelar suscripción
            </button>
          </>
        )}

        {isCanceled && (
          <>
            <p className="mb-1 text-sm text-white font-semibold">Plan Pro cancelado</p>
            {currentPeriodEnd && (
              <p className="mb-1 text-xs text-slate-500">
                Acceso hasta: <span className="text-slate-300">{formatDate(currentPeriodEnd)}</span>
              </p>
            )}
            {canceledAt && (
              <p className="mb-5 text-xs text-slate-600">
                Cancelado el {formatDate(canceledAt)}
              </p>
            )}
            <Link
              href="/upgrade"
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              Reactivar Pro
            </Link>
          </>
        )}
      </div>

      {/* Confirm cancel dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-6">
            <h2 className="mb-2 text-sm font-semibold text-white">¿Cancelar suscripción?</h2>
            <p className="mb-5 text-xs text-slate-500">
              Seguirás con acceso Pro hasta el fin del período actual.
              Después tu cuenta pasará al plan Free.
            </p>
            {cancelError && (
              <p className="mb-3 text-xs text-red-400">{cancelError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirm(false); setCancelError('') }}
                disabled={canceling}
                className="flex-1 rounded-xl border border-[#1e2d45] py-2 text-xs font-medium text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                Mantener plan
              </button>
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="flex-1 rounded-xl bg-red-600/80 py-2 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {canceling ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
