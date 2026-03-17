'use client'

import { useFinanceStore } from '@/store/useFinanceStore'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function MonthSelector() {
  const { activeYear, activeMonth, goToPrevMonth, goToNextMonth } = useFinanceStore()
  const now = new Date()
  const isCurrentMonth = activeYear === now.getFullYear() && activeMonth === now.getMonth()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPrevMonth}
        className="w-7 h-7 rounded-lg bg-[#1e2d45] hover:bg-[#2a3f5f] text-slate-300 text-sm flex items-center justify-center transition-all"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-white min-w-[130px] text-center">
        {MONTHS[activeMonth]} {activeYear}
      </span>
      <button
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
        className="w-7 h-7 rounded-lg bg-[#1e2d45] hover:bg-[#2a3f5f] text-slate-300 text-sm flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  )
}
