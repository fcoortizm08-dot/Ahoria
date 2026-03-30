'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PaywallGate } from '@/components/common/PaywallGate'
import { FEATURE_KEYS } from '@/lib/plans'
import type { Goal } from '@/types'

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-[#0d1117] p-4 border border-[#1e2d45] space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1a2535]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-[#1a2535]" />
              <div className="h-2.5 w-20 rounded bg-[#1a2535]" />
            </div>
            <div className="h-4 w-24 rounded bg-[#1a2535]" />
          </div>
          <div className="h-2 w-full rounded-full bg-[#1a2535]" />
        </div>
      ))}
    </div>
  )
}

type ContributeForm = { goalId: string; amount: string }

export default function GoalsPage() {
  const now = new Date()

  const [goals, setGoals]         = useState<Goal[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [limitReached, setLimitReached] = useState(false)

  const [contributeForm, setContributeForm] = useState<ContributeForm | null>(null)
  const [contributing, setContributing]     = useState(false)
  const [contributeError, setContributeError] = useState('')

  const [form, setForm] = useState({
    name:          '',
    target_amount: '',
    target_date:   '',
    icon:          '🎯',
    color:         '#8b5cf6',
  })

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/goals')
      const json = await res.json() as { goals?: Goal[] }
      setGoals(json.goals ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.target_amount || !form.target_date) {
      setFormError('Completa todos los campos requeridos.')
      return
    }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/goals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          form.name,
        target_amount: parseFloat(form.target_amount),
        target_date:   form.target_date,
        icon:          form.icon,
        color:         form.color,
      }),
    })
    const json = await res.json() as { goal?: Goal; error?: string; limit?: number }
    if (!res.ok) {
      if (json.error === 'limit_reached') {
        setLimitReached(true)
        setShowForm(false)
      } else {
        setFormError(json.error ?? 'Error al guardar.')
      }
      setSubmitting(false)
      return
    }
    setGoals(prev => [...prev, json.goal!])
    setShowForm(false)
    setForm({ name: '', target_amount: '', target_date: '', icon: '🎯', color: '#8b5cf6' })
    setSubmitting(false)
  }

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributeForm || !contributeForm.amount) {
      setContributeError('Ingresa un monto.')
      return
    }
    setContributing(true)
    setContributeError('')
    const res = await fetch(`/api/goals/${contributeForm.goalId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(contributeForm.amount) }),
    })
    const json = await res.json() as { goal?: Goal; error?: string }
    if (!res.ok) {
      setContributeError(json.error ?? 'Error al registrar aporte.')
      setContributing(false)
      return
    }
    setGoals(prev => prev.map(g => g.id === json.goal!.id ? json.goal! : g))
    setContributeForm(null)
    setContributing(false)
  }

  const progressPct = (goal: Goal) =>
    Math.min(100, goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white">Metas</h1>
        {!limitReached ? (
          <button
            onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            {showForm ? 'Cancelar' : '+ Nueva meta'}
          </button>
        ) : null}
      </div>

      {/* Paywall if limit reached */}
      {limitReached && (
        <PaywallGate featureKey={FEATURE_KEYS.MAX_GOALS}>
          <></>
        </PaywallGate>
      )}

      {/* Add form */}
      {showForm && !limitReached && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-white mb-1">Nueva meta</p>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ej: Fondo de emergencia"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Monto objetivo (CLP) *</label>
              <input
                type="number"
                min="1"
                value={form.target_amount}
                onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="1000000"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Fecha límite *</label>
              <input
                type="date"
                value={form.target_date}
                min={now.toISOString().split('T')[0]}
                onChange={(e) => setForm(f => ({ ...f, target_date: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Ícono</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                placeholder="🎯"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-full h-[34px] rounded-xl border border-[#1e2d45] bg-[#111827] px-1 py-0.5 focus:border-blue-500 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError('') }}
              className="flex-1 rounded-xl border border-[#1e2d45] py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Crear meta'}
            </button>
          </div>
        </form>
      )}

      {/* Contribute form */}
      {contributeForm && (
        <form
          onSubmit={handleContribute}
          className="rounded-2xl border border-[#1e2d45] bg-[#0d1117] p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-white mb-1">Registrar aporte</p>
          {contributeError && <p className="text-xs text-red-400">{contributeError}</p>}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Monto (CLP) *</label>
            <input
              type="number"
              min="1"
              value={contributeForm.amount}
              onChange={(e) => setContributeForm(f => f ? { ...f, amount: e.target.value } : null)}
              className="w-full rounded-xl border border-[#1e2d45] bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="50000"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setContributeForm(null); setContributeError('') }}
              className="flex-1 rounded-xl border border-[#1e2d45] py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={contributing}
              className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {contributing ? 'Guardando…' : 'Registrar aporte'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <Skeleton />
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1e2d45] bg-[#0d1117] py-14 text-center">
          <p className="text-2xl mb-2">🎯</p>
          <p className="text-sm text-slate-500">Sin metas activas</p>
          {!limitReached && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition underline"
            >
              Crear la primera
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const pct = progressPct(goal)
            return (
              <div
                key={goal.id}
                className="rounded-xl border border-[#1e2d45] bg-[#0d1117] px-4 py-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${goal.color}22` }}
                  >
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{goal.name}</p>
                    <p className="text-[11px] text-slate-600">
                      Vence {formatDate(goal.target_date)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-white">{formatCurrency(goal.current_amount)}</p>
                    <p className="text-[11px] text-slate-600">de {formatCurrency(goal.target_amount)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-[#1a2535] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-600">{pct}% completado</span>
                    {pct >= 100 && <span className="text-[10px] text-emerald-500 font-medium">Completada</span>}
                  </div>
                </div>

                {pct < 100 && (
                  <button
                    onClick={() => {
                      setContributeForm({ goalId: goal.id, amount: '' })
                      setContributeError('')
                    }}
                    className="w-full rounded-xl border border-[#1e2d45] py-1.5 text-[11px] text-slate-400 hover:text-white hover:border-slate-600 transition"
                  >
                    + Registrar aporte
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
