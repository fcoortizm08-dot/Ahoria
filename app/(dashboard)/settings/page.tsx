'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Profile } from '@/types'

export default function SettingsPage() {
  const { profile, setProfile, addToast } = useFinanceStore()
  const [form, setForm] = useState({ full_name: '', monthly_income_goal: '', savings_goal_pct: '' })
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        monthly_income_goal: profile.monthly_income_goal ? String(profile.monthly_income_goal) : '',
        savings_goal_pct: profile.savings_goal_pct ? String(profile.savings_goal_pct) : '30',
      })
    }
    const loadEmail = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    loadEmail()
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates: Partial<Profile> = {
      full_name: form.full_name,
      monthly_income_goal: form.monthly_income_goal ? Number(form.monthly_income_goal) : 0,
      savings_goal_pct: form.savings_goal_pct ? Number(form.savings_goal_pct) : 30,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      addToast('Error al guardar los cambios', 'error')
    } else {
      setProfile(data)
      addToast('Perfil actualizado correctamente')
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-extrabold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Personaliza tu perfil y metas financieras</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Perfil */}
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Perfil</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre completo</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Tu nombre"
              className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
            <input
              value={email}
              disabled
              className="w-full bg-[#111827]/50 border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Metas financieras */}
        <div className="bg-[#0d1117] rounded-xl border border-[#1e2d45] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Metas financieras</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ingreso mensual objetivo (CLP)</label>
            <input
              type="number"
              value={form.monthly_income_goal}
              onChange={e => setForm(f => ({ ...f, monthly_income_goal: e.target.value }))}
              placeholder="Ej: 1500000"
              min="0"
              className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
            />
            <p className="text-[10px] text-slate-500 mt-1">Se muestra como referencia en el dashboard</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Meta de ahorro: <span className="text-blue-400">{form.savings_goal_pct}%</span>
            </label>
            <input
              type="range"
              value={form.savings_goal_pct}
              onChange={e => setForm(f => ({ ...f, savings_goal_pct: e.target.value }))}
              min="0" max="80" step="5"
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Danger zone */}
      <div className="bg-[#0d1117] rounded-xl border border-red-500/20 p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white">Sesión</h2>
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl py-2.5 text-sm transition-all border border-red-500/20"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
