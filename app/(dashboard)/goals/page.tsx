'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Goal } from '@/types'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

const ICONS  = ['🎯','🏠','✈️','🚗','💻','📚','💊','🎓','💰','🌟','🏖️','🎸','👶','🐕','🏋️']
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']
const EMPTY_FORM = { name: '', target_amount: '', target_date: '', icon: '🎯', color: '#3b82f6' }

export default function GoalsPage() {
  const [goals, setGoals]             = useState<Goal[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const { addToast } = useFinanceStore()

  const fetchGoals = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id)
      .order('status').order('created_at', { ascending: false })
    setGoals(data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const totalSaved     = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget    = activeGoals.reduce((s, g) => s + g.target_amount, 0)
  const overallPct     = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('goals').insert({
      user_id: user.id, name: form.name,
      target_amount: Number(form.target_amount), current_amount: 0,
      target_date: form.target_date, icon: form.icon, color: form.color, status: 'active',
    })
    if (error) addToast('Error al crear la meta', 'error')
    else {
      addToast('Meta creada ✓')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchGoals()
    }
    setSaving(false)
  }

  const handleDeposit = async (goal: Goal) => {
    if (!depositAmount || Number(depositAmount) <= 0) return
    const supabase = createClient()
    const newAmount = goal.current_amount + Number(depositAmount)
    const newStatus = newAmount >= goal.target_amount ? 'completed' : 'active'
    const { error } = await supabase.from('goals').update({
      current_amount: newAmount, status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', goal.id)
    if (!error) {
      addToast(newStatus === 'completed' ? `¡Meta "${goal.name}" completada! 🎉` : `Depósito de ${formatCurrency(Number(depositAmount))} registrado ✓`)
      setDepositAmount('')
      setDepositGoalId(null)
      fetchGoals()
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    addToast('Meta eliminada')
    fetchGoals()
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Metas de ahorro</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} activa{activeGoals.length !== 1 ? 's' : ''}
            {totalTarget > 0 && ` · ${overallPct}% del total`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
        >
          + Nueva meta
        </button>
      </div>

      {/* ── KPI ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total ahorrado</p>
          <p className="text-2xl font-extrabold tracking-tight text-blue-500 mb-1">{formatCurrency(totalSaved)}</p>
          <p className="text-xs text-gray-400">de {formatCurrency(totalTarget)} objetivo</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Metas activas</p>
          <p className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">{activeGoals.length}</p>
          <p className="text-xs text-gray-400">en progreso</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Metas completadas</p>
          <p className="text-2xl font-extrabold tracking-tight text-emerald-600 mb-1">{completedGoals.length}</p>
          <p className="text-xs text-gray-400">{completedGoals.length > 0 ? '¡Buen trabajo! 🎉' : 'Aún ninguna'}</p>
        </div>
      </div>

      {/* ── ADD FORM ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Nueva meta de ahorro</h2>
              <p className="text-xs text-gray-400 mt-0.5">Define tu objetivo y empieza a ahorrar</p>
            </div>
            <button onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre de la meta *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Ej: Fondo de emergencia, Viaje a Europa..." autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Monto objetivo (CLP) *</label>
                <input
                  type="number" value={form.target_amount}
                  onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                  required min="1" placeholder="2.000.000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha objetivo *</label>
                <input
                  type="date" value={form.target_date}
                  onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ícono</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONS.map(icon => (
                    <button key={icon} type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className="text-lg p-1.5 rounded-lg transition-all"
                      style={{
                        border: `2px solid ${form.icon === icon ? '#3B82F6' : 'transparent'}`,
                        backgroundColor: form.icon === icon ? '#EFF6FF' : 'transparent',
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button key={color} type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className="w-7 h-7 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: form.color === color ? color : 'transparent',
                        outline: form.color === color ? `2px solid ${color}` : 'none',
                        outlineOffset: 2,
                        transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                {saving ? 'Creando...' : 'Crear meta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── GOALS GRID ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-base font-bold text-gray-700 mb-1">Define tu primer objetivo</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Del sueño al plan concreto. Crea una meta, deposita ahorros y ve tu progreso crecer.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
            + Crear primera meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {goals.map(goal => {
            const progress    = calculatePercentage(goal.current_amount, goal.target_amount)
            const isCompleted = goal.status === 'completed'
            const daysLeft    = goal.target_date
              ? Math.ceil((new Date(goal.target_date + 'T00:00:00').getTime() - Date.now()) / 86400000)
              : null
            const isDepositing = depositGoalId === goal.id

            return (
              <div key={goal.id}
                className="bg-white rounded-2xl border p-6 relative transition-shadow hover:shadow-md"
                style={{
                  borderColor: isCompleted ? '#A7F3D0' : '#E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>

                {/* Completed badge */}
                {isCompleted && (
                  <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>
                    ✓ Completada
                  </span>
                )}

                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: goal.color + '18' }}>
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate pr-16">{goal.name}</h3>
                    {!isCompleted && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(goal.target_date)}
                        {daysLeft !== null && daysLeft > 0 && (
                          <span style={{ color: daysLeft <= 30 ? '#F59E0B' : '#9CA3AF' }}>
                            {' '}· {daysLeft} días restantes
                          </span>
                        )}
                        {daysLeft !== null && daysLeft <= 0 && (
                          <span className="text-red-400"> · ¡Vencida!</span>
                        )}
                      </p>
                    )}
                  </div>
                  {!isCompleted && (
                    <button onClick={() => handleDelete(goal.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-400 transition-colors text-sm p-1.5 rounded-lg hover:bg-red-50">
                      ✕
                    </button>
                  )}
                </div>

                {/* Amounts */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Ahorrado</p>
                    <p className="text-xl font-extrabold tracking-tight text-gray-900">
                      {formatCurrency(goal.current_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Meta</p>
                    <p className="text-base font-bold text-gray-400">{formatCurrency(goal.target_amount)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: isCompleted ? '#10B981' : goal.color,
                    }} />
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  <span className="font-semibold" style={{ color: goal.color }}>{progress}%</span>
                  {' '}completado · Faltan{' '}
                  <span className="font-medium text-gray-600">{formatCurrency(Math.max(goal.target_amount - goal.current_amount, 0))}</span>
                </p>

                {/* Deposit action */}
                {!isCompleted && (
                  isDepositing ? (
                    <div className="flex gap-2">
                      <input
                        type="number" value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="Monto a depositar" autoFocus
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                      <button onClick={() => handleDeposit(goal)}
                        className="px-3 py-2 text-sm font-semibold text-white rounded-lg shrink-0"
                        style={{ backgroundColor: goal.color }}>
                        Depositar
                      </button>
                      <button onClick={() => { setDepositGoalId(null); setDepositAmount('') }}
                        className="px-2 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDepositGoalId(goal.id)}
                      className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
                      style={{
                        color: goal.color,
                        border: `1.5px solid ${goal.color}40`,
                        backgroundColor: goal.color + '08',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = goal.color + '14')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = goal.color + '08')}
                    >
                      + Depositar ahorro
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
