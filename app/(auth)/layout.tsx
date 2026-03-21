export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FFFFFF' }}>

      {/* Left panel — desktop only */}
      <div
        className="hidden lg:flex lg:w-[480px] flex-col justify-between"
        style={{
          padding: '48px',
          backgroundColor: '#F0FDF4',
          borderRight: '1px solid #D1FAE5',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontWeight: 800, fontSize: '18px',
          }}>
            A
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
              AHO<span style={{ color: '#10B981' }}>RIA</span>
            </span>
          </div>
        </div>

        {/* Central copy */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
            borderRadius: '999px', padding: '6px 14px', marginBottom: '24px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '999px',
              backgroundColor: '#10B981', animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>Tu dinero, en orden</span>
          </div>

          <h1 style={{
            fontSize: '38px', fontWeight: 900, lineHeight: 1.15,
            letterSpacing: '-1px', marginBottom: '16px', color: '#111827',
          }}>
            Ahorra ahora.<br />
            <span style={{ color: '#10B981' }}>Vive mejor.</span>
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#6B7280', marginBottom: '36px' }}>
            Entiende tu situación financiera en menos de 1 minuto
            y toma mejores decisiones, todos los días.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '📊', title: 'Pulso financiero en tiempo real', desc: 'Tu salud financiera de un vistazo' },
              { icon: '💸', title: 'Control de ingresos y gastos', desc: 'Registra en 3 toques, sin complicaciones' },
              { icon: '🎯', title: 'Metas de ahorro con progreso', desc: 'Del sueño al plan concreto' },
              { icon: '✦', title: 'Asistente IA incluido', desc: 'Análisis, consejos y proyecciones' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#9CA3AF' }}>© 2026 AHORIA · Finanzas personales inteligentes</p>
      </div>

      {/* Right: form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      }}>
        {children}
      </div>
    </div>
  )
}
