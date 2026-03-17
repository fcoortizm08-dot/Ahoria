import { create } from 'zustand'
import type { Profile } from '@/types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface FinanceStore {
  // Mes activo para navegación
  activeYear: number
  activeMonth: number // 0-indexed
  setActiveMonth: (year: number, month: number) => void
  goToPrevMonth: () => void
  goToNextMonth: () => void

  // Profile
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  // Toasts
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'error') => void
  removeToast: (id: string) => void
}

const now = new Date()

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  activeYear: now.getFullYear(),
  activeMonth: now.getMonth(),

  setActiveMonth: (year, month) => set({ activeYear: year, activeMonth: month }),

  goToPrevMonth: () => {
    const { activeYear, activeMonth } = get()
    if (activeMonth === 0) {
      set({ activeYear: activeYear - 1, activeMonth: 11 })
    } else {
      set({ activeMonth: activeMonth - 1 })
    }
  },

  goToNextMonth: () => {
    const { activeYear, activeMonth } = get()
    const today = new Date()
    if (activeYear === today.getFullYear() && activeMonth === today.getMonth()) return
    if (activeMonth === 11) {
      set({ activeYear: activeYear + 1, activeMonth: 0 })
    } else {
      set({ activeMonth: activeMonth + 1 })
    }
  },

  profile: null,
  setProfile: (profile) => set({ profile }),

  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3500)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
