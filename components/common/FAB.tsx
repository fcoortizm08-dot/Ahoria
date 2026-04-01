'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Category } from '@/types'

const PAYMENT_ICONS: Record<string, string> = {
  card: '💳',
  cash: '💵',
  transfer: '🏦',
  bnpl: '📦',
}

export function FAB() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'amount' | 'category'>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer' | 'bnpl'>('card')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const { addToast } = useFinanceStore()

  useEffect(() => {
    if (open && categories.length === 0) {
      const load = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${user.id},is_system.eq.true`)
          .order('sort_order')
        setCategories(data ?? [])
      }
      load()
    }
  }, [open, categories.length])

  const reset = () => {
    setAmount(''); setDescription(''); setCategoryId(null)
    setStep('amount'); setType('expense'); setPaymentMethod('card')
  }

  const close = () => { setOpen(false); reset() }

  const handleAmountNext = () => {
    if (!amount || Number(amount) <= 0) return
    setStep('category')
  }

  const handleSave = async (catId: string | null = categoryId) => {
    if (!amount || Number(amount) <= 0) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type,
      description: description || (catId ? categories.find(c => c.id === catId)?.name ?? type : type === 'expense' ? 'Gasto' : 'Ingreso'),
      amount: Number(amount),
      category_id: catId,
      date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      is_recurring: false,
      installments: 1,
      installment_no: 1,
    })

    if (error) addToast('Error al guardar', 'error')
    else {
      addToast(type === 'expense' ? '💸 Gasto registrado' : '💰 Ingreso registrado')
      close()
    }
    setSaving(false)
  }

  const visibleCats = categories.filter(c => c.type === type)

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Modal de registro */}
      {open && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex gap-1 p-1 bg-[#1e2d45] rounded-xl">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      type === t
                        ? t === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t === 'expense' ? '↑ Gasto' : '↓ Ingreso'}
                  </button>
                ))}
              </div>
              <button onClick={close} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>

            {step === 'amount' ? (
              <div className="px-4 pb-4 flex flex-col gap-3">
                {/* Monto */}
                <div className="text-center py-2">
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {amount ? `$${Number(amount).toLocaleString('es-CL')}` : <span className="text-slate-600">$0</span>}
                  </div>
                </div>

                {/* Teclado numérico */}
                <div className="grid grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(k => (
                    <button
                      key={k}
                      onClick={() => {
                        if (k === '⌫') setAmount(a => a.slice(0, -1))
                        else setAmount(a => {
                          const next = a + k
                          return next.length > 9 ? a : next
                        })
                      }}
                      className={`h-12 rounded-xl text-lg font-semibold transition-all ${
                        k === '⌫'
                          ? 'bg-[#1e2d45] text-slate-400 hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-[#1e2d45] text-white hover:bg-[#2a3f5f] active:scale-95'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Descripción opcional */}
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full bg-[#111827] border border-[#1e2d45] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all"
                />

                {/* Método de pago */}
                <div className="flex gap-2">
                  {(['card', 'cash', 'transfer', 'bnpl'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                        paymentMethod === m
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#1e2d45] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {PAYMENT_ICONS[m]}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAmountNext}
                  disabled={!amount || Number(amount) <= 0}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-bold rounded-xl py-3 text-sm transition-all"
                >
                  Siguiente → Categoría
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep('amount')} className="text-slate-400 hover:text-white text-sm">← Volver</button>
                  <span className="text-white font-bold">${Number(amount).toLocaleString('es-CL')}</span>
                </div>

                <p className="text-xs text-slate-400 font-semibold">Selecciona categoría</p>

                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {visibleCats.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(cat.id); handleSave(cat.id) }}
                      disabled={saving}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${
                        categoryId === cat.id
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-[#1e2d45] hover:bg-[#2a3f5f]'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[9px] text-slate-300 text-center leading-tight line-clamp-2">{cat.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleSave(null)}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-[#1e2d45] text-slate-400 hover:text-white text-sm font-semibold transition-all"
                >
                  {saving ? 'Guardando...' : 'Guardar sin categoría'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB principal */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
          open
            ? 'bg-slate-700 text-white rotate-45 scale-90'
            : 'bg-blue-500 hover:bg-blue-400 text-white hover:scale-110 active:scale-95'
        }`}
        title="Registrar gasto rápido"
      >
        +
      </button>
    </>
  )
}
