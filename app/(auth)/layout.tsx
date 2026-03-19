export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#070e0a' }}>

      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between p-12"
        style={{ backgroundColor: '#0e1912', borderRight: '1px solid #1e3228' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-base"
            style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
            A
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: '#ecfdf5' }}>
            AHO<span style={{ color: '#34d399' }}>RIA</span>
          </span>
        </div>

        {/* Copy central */}
        <div>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full ah-pulse" style={{ backgroundColor: '#34d399' }} />
            <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Tu dinero, en orden</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-4" style={{ color: '#ecfdf5' }}>
            Ahorra ahora.<br />
            <span style={{ color: '#34d399' }}>Vive mejor.</span>
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: '#6b8f7a' }}>
            Entiende tu situación financiera en menos de 1 minuto
            y toma mejores decisiones, todos los días.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { icon: '📊', title: 'Pulso financiero en tiempo real', desc: 'Tu salud financiera de un vistazo' },
              { icon: '💸', title: 'Control de ingresos y gastos', desc: 'Registra en 3 toques, sin complicaciones' },
              { icon: '🎯', title: 'Metas de ahorro con progreso', desc: 'Del sueño al plan concreto' },
              { icon: '✦', title: 'Asistente IA incluido', desc: 'Preguntas, análisis y consejos reales' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#ecfdf5' }}>{f.title}</p>
                  <p className="text-xs" style={{ color: '#6b8f7a' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: '#364d3f' }}>© 2026 AHORIA · Para profesionales de LATAM</p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  )
}
