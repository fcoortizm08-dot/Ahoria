'use client'

interface Props {
  used: number
  limit: number
  onUpgrade?: () => void
}

const SAMPLE_CONVERSATION = [
  { role: 'user', text: '¿Cómo estoy este mes?' },
  { role: 'ai',   text: 'Llevas 17 días de Marzo y has gastado $420.000, que es el 68% de tus ingresos. Tu mayor gasto fue Restaurantes con $95.000 — un 40% más que el mes anterior. A este ritmo terminarás el mes con $180.000 disponibles.' },
  { role: 'user', text: '¿En qué debería recortar?' },
  { role: 'ai',   text: 'Delivery y Restaurantes suman $145.000 este mes. Si los reduces a $80.000 entre ambos, ahorrarías $65.000 extra — suficiente para acelerar tu meta de Viaje en 2 meses.' },
]

export function PremiumGate({ used, limit, onUpgrade }: Props) {
  const isLimitReached = used >= limit
  const remaining = Math.max(0, limit - used)

  return (
    <div className="flex flex-col gap-6">
      {/* Preview conversación */}
      <div className="relative">
        <div className="flex flex-col gap-3 px-1">
          {SAMPLE_CONVERSATION.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                  F
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-sm'
                  : 'bg-[#111827] border border-[#1e2d45] text-slate-200 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Blur overlay sobre el preview */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#060d17] to-transparent" />
      </div>

      {/* Gate card */}
      <div className="bg-[#0d1117] border border-violet-500/30 rounded-2xl overflow-hidden">
        {/* Accent */}
        <div className="h-0.5 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />

        <div className="p-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-4">
            <span className="text-sm">✨</span>
            <span className="text-xs font-bold text-violet-400">FinTrack Pro — Premium</span>
          </div>

          <h2 className="text-[17px] font-extrabold text-white mb-1">
            Tu asistente financiero personal
          </h2>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
            {isLimitReached
              ? `Usaste tus ${limit} mensajes gratuitos de este mes. Actualiza a Premium para conversaciones ilimitadas con IA.`
              : `Tienes ${remaining} mensaje${remaining !== 1 ? 's' : ''} gratis este mes. Con Premium tendrás acceso ilimitado + análisis más profundos.`
            }
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 gap-2 mb-5">
            {[
              { icon: '💬', title: 'Chat ilimitado', desc: 'Pregunta lo que quieras sobre tus finanzas' },
              { icon: '🧠', title: 'Análisis inteligente', desc: 'Detecta patrones y oportunidades de ahorro' },
              { icon: '🔮', title: 'Proyecciones precisas', desc: '¿Cuándo logro mi meta? ¿Puedo comprar X?' },
              { icon: '⚡', title: 'Modelo Sonnet', desc: 'Respuestas más inteligentes y detalladas' },
              { icon: '📋', title: 'Resúmenes semanales', desc: 'Informe narrativo automático cada lunes' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 py-1.5">
                <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[12px] font-semibold text-white">{f.title}</p>
                  <p className="text-[11px] text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Activar Premium ✨
          </button>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            Próximamente · Por ahora disfruta los mensajes gratuitos
          </p>
        </div>
      </div>

      {/* Indicador de uso */}
      {!isLimitReached && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(used / limit) * 100}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{used}/{limit} mensajes</span>
        </div>
      )}
    </div>
  )
}
