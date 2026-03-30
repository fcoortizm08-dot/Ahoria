'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PRICING, FEATURE_KEYS, FREE_DEFAULTS } from '@/lib/plans'

// BILLING_ENABLED is a server-side env var — not available in client bundles.
// We use NEXT_PUBLIC_BILLING_ENABLED for client components.
const BILLING_ENABLED =
  process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_BILLING_ENABLED === '1'

const FEATURE_ROWS = [
  {
    label:   'Transacciones por mes',
    freeVal: FREE_DEFAULTS[FEATURE_KEYS.MAX_TRANSACTIONS_MONTH],
    proVal:  'Ilimitadas',
  },
  {
    label:   'Metas activas',
    freeVal: FREE_DEFAULTS[FEATURE_KEYS.MAX_GOALS],
    proVal:  'Ilimitadas',
  },
  {
    label:   'Deudas activas',
    freeVal: FREE_DEFAULTS[FEATURE_KEYS.MAX_DEBTS],
    proVal:  'Ilimitadas',
  },
  {
    label:   'Categorías personalizadas',
    freeVal: FREE_DEFAULTS[FEATURE_KEYS.CATEGORIES_CUSTOM],
    proVal:  'Ilimitadas',
  },
  {
    label:   'Exportar a CSV',
    freeVal: '✗',
    proVal:  '✓',
  },
  {
    label:   'Analítica avanzada',
    freeVal: '✗',
    proVal:  '✓',
  },
]

function WaitlistForm() {
  const [email, setEmail]     = useState('')
  const [saved, setSaved]     = useState(false)
  const [invalid, setInvalid] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    // Persist in localStorage until backend waitlist is ready
    const existing: string[] = JSON.parse(
      localStorage.getItem('waitlist_emails') ?? '[]',
    )
    if (!existing.includes(email)) {
      localStorage.setItem('waitlist_emails', JSON.stringify([...existing, email]))
    }
    setSaved(true)
  }

  if (saved) {
    return (
      <p className="text-center text-xs text-blue-400">
        ¡Listo! Te avisaremos cuando Pro esté disponible.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-sm gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setInvalid(false) }}
          placeholder="tu@email.com"
          className="flex-1 rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
          aria-label="Email para lista de espera"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          Unirme
        </button>
      </div>
      {invalid && (
        <p className="text-[11px] text-red-400">Ingresa un email válido.</p>
      )}
    </form>
  )
}

type CheckoutState = 'idle' | 'loading' | 'error'

function CheckoutButton() {
  const [state, setState]       = useState<CheckoutState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleCheckout = async () => {
    setState('loading')
    setErrorMsg('')
    try {
      const res  = await fetch('/api/billing/mercado-pago/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      const json = await res.json() as { checkoutUrl?: string; message?: string; error?: string }
      if (!res.ok) {
        setErrorMsg(json.message ?? json.error ?? 'No se pudo iniciar el pago. Intenta de nuevo.')
        setState('error')
        return
      }
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setState('error')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleCheckout}
        disabled={state === 'loading'}
        className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? 'Redirigiendo…' : 'Activar Pro — 14 días gratis'}
      </button>
      {state === 'error' && (
        <p className="max-w-xs text-center text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  )
}

export default function UpgradePage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Planes</h1>
        <p className="text-sm text-slate-500">
          Elige el plan que mejor se adapte a tus finanzas.
        </p>
      </div>

      {/* Plan cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Free
          </div>
          <div className="mb-4 text-3xl font-bold text-white">
            $0{' '}
            <span className="text-base font-normal text-slate-500">CLP / mes</span>
          </div>
          <ul className="space-y-2">
            {FEATURE_ROWS.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{row.label}</span>
                <span className={row.freeVal === '✗' ? 'text-slate-600' : 'text-white font-medium'}>
                  {row.freeVal}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 ring-1 ring-blue-500/20">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Pro
            </span>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
              14 días gratis
            </span>
          </div>
          <div className="mb-4 text-3xl font-bold text-white">
            ${PRICING.pro.clp.toLocaleString('es-CL')}{' '}
            <span className="text-base font-normal text-slate-500">CLP / mes</span>
          </div>
          <ul className="space-y-2">
            {FEATURE_ROWS.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{row.label}</span>
                <span className={row.proVal === '✓' ? 'text-blue-400 font-semibold' : 'text-white font-medium'}>
                  {row.proVal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        {BILLING_ENABLED ? (
          <CheckoutButton />
        ) : (
          <>
            <p className="text-center text-xs text-slate-500">
              Próximamente — únete a la lista de espera y te avisamos cuando Pro esté disponible.
            </p>
            <WaitlistForm />
          </>
        )}

        <Link href="/dashboard" className="text-xs text-slate-600 hover:text-slate-400 transition">
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
