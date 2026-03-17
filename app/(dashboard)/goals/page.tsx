'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils'
import type { Goal } from '@/types'

const ICONS = ['🎯', '🏠', '✈️', '🚗', '💻', '📚', '💊', '🎓', '💰', '🌟']
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDeposit, setShowDeposit] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '', icon: '🎯', color: '#3b82f6' })
  const [saving, setSaving] = useState(false)

  const fetchGoals = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setGoals(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchGoals() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('goals').insert({
      user_id: user.id,
      name: form.name,
      target_amount: Number(form.target_amount),
      current_amount: 0,
      target_date: form.target_date,
      icon: form.icon,
      color: form.color,
      status: 'active',
    })

    setForm({ name: '', target_amount: '', target_date: '', icon: '🎯', color: '#3b82f6' })
    setShowForm(false)
    setSaving(false)
    fetchGoals()
  }

  const handleDeposit = async (goalId: string, currentAmount: number) => {
    if (!depositAmount) return
    const supabase = createClient()
    const newAmount = currentAmount + Number(depositAmount)
    const goal = goals.find(g => g.id === goalId)
    const newStatus = goal && newAmount >= goal.target_amount ? 'completed' : 'active'
    await supabase.from('goals').update({ current_amount: newAmount, status: newStatus }).eq('id', goalId)
    setDepositAmount('')
    setShowDeposit(null)
    fetchGoals()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Metas de ahorro</h1>
          <p className="text-slate-400 text-sm mt-0.5">{goals.filter(g => g.status === 'active').length} meta{goals.filter(g => g.status === 'active').length !== 1 ? 's' : ''} activa{goals.filter(g => g.status === 'active').length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all">
          + Nueva meta
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Nueva meta de ahorro</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre de la meta</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ej: Viaje a Europa" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto objetivo (CLP)</label>
              <input type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} required min="1" placeholder="2000000" className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha objetivo</label>
              <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} required className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ícono</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} className={`text-lg p-1.5 rounded-lg transition-all ${form.icon === icon ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'hover:bg-white/5'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))} className={`w-7 h-7 rounded-full transition-all ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1117]' : ''}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Crear meta'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-8 text-center text-slate-500 text-sm">Cargando...</div>
      ) : goals.length === 0 ? (
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-8 text-center text-slate-500 text-sm">No tienes metas registradas. ¡Crea tu primera meta!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const progress = calculatePercentage(goal.current_amount, goal.target_amount)
            const isCompleted = goal.status === 'completed'
            return (
              <div key={goal.id} className={`bg-[#0d1117] rounded-xl border p-5 flex flex-col gap-3 ${isCompleted ? 'border-emerald-500/20' : 'border-[#1e2d45]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: goal.color + '20' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{goal.name}</p>
                      {isCompleted
                        ? <span className="text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full px-2 py-0.5">Completada ✓</span>
                        : <p className="text-[10px] text-slate-500">Fecha: {formatDate(goal.target_date)}</p>
                      }
                    </div>
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="text-slate-600 hover:text-red-400 text-xs transition-all">✕</button>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ahorrado: <span className="text-white font-semibold">{formatCurrency(goal.current_amount)}</span></span>
                  <span className="text-slate-400">Meta: <span className="text-white font-semibold">{formatCurrency(goal.target_amount)}</span></span>
                </div>
                <div className="w-full bg-[#1e2d45] rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: goal.color }} />
                </div>
                <p className="text-[10px] text-slate-500">{progress}% completado</p>
                {!isCompleted && (
                  showDeposit === goal.id ? (
                    <div className="flex gap-2">
                      <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Monto a depositar" className="flex-1 bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all" />
                      <button onClick={() => handleDeposit(goal.id, goal.current_amount)} className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-xl px-3 py-2 transition-all">Depositar</button>
                      <button onClick={() => { setShowDeposit(null); setDepositAmount('') }} className="text-slate-500 text-xs hover:text-white transition-all">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeposit(goal.id)} className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-all text-left">+ Agregar ahorro</button>
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
