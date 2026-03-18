'use client'

import { AIChatInterface } from '@/components/ai/AIChatInterface'

export default function AIPage() {
  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3rem)] pb-0">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-violet-500/20">
            F
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-white leading-tight">Fin — Asistente IA</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] text-slate-500">Conectado · Conoce tus finanzas</p>
            </div>
          </div>
        </div>

        {/* Badge Premium */}
        <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">
          <span className="text-xs">✨</span>
          <span className="text-[10px] font-bold text-violet-400">Premium</span>
        </div>
      </div>

      {/* Capabilities chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 flex-shrink-0 scrollbar-none -mx-4 px-4">
        {[
          { icon: '📊', label: 'Análisis del mes' },
          { icon: '🔮', label: 'Proyecciones' },
          { icon: '💡', label: 'Consejos reales' },
          { icon: '🎯', label: 'Metas y plazos' },
          { icon: '⚠️', label: 'Alertas' },
        ].map(c => (
          <div key={c.label}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2d45] rounded-full px-2.5 py-1">
            <span className="text-xs">{c.icon}</span>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Chat interface */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AIChatInterface />
      </div>
    </div>
  )
}
