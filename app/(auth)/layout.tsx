import { AhIconInline } from '@/components/ui/ah-logo'

const FEATURES = [
  { icon: '📊', title: 'Pulso financiero en tiempo real',  desc: 'Tu salud financiera de un vistazo' },
  { icon: '💸', title: 'Control de ingresos y gastos',     desc: 'Registra en 3 toques, sin complicaciones' },
  { icon: '🎯', title: 'Metas de ahorro con progreso',     desc: 'Del sueño al plan concreto' },
  { icon: '✦',  title: 'Asistente IA incluido',            desc: 'Análisis, consejos y proyecciones' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FFFFFF' }}>

      {/* ── LEFT PANEL — desktop only ───────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] flex-col justify-between"
        style={{ padding: '48px', backgroundColor: '#F7F9F7', borderRight: '1px solid #E5E7EB' }}
      >
        {/* Logo — real SVG icon + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AhIconInline size={40} />
          <div>
            <div style={{
              fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px',
              color: '#1F2937', lineHeight: 1,
            }}>
              AHORIA
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
              Finanzas personales inteligentes
            </div>
          </div>
        </div>

        {/* Central copy */}
        <div>
          {/* Live badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: '999px', padding: '5px 12px', marginBottom: '28px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '999px',
              backgroundColor: '#4A90E2',
            }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
              Tu dinero, en orden
            </span>
          </div>

          <h1 style={{
            fontSize: '38px', fontWeight: 900, lineHeight: 1.15,
            letterSpacing: '-1px', marginBottom: '16px', color: '#1F2937',
            margin: '0 0 16px',
          }}>
            Ahorra ahora.<br />
            <span style={{ color: '#5DBB63' }}>Vive mejor.</span>
          </h1>

          <p style={{
            fontSize: '15px', lineHeight: 1.75, color: '#6B7280',
            marginBottom: '36px', margin: '0 0 36px',
          }}>
            Entiende tu situación financiera en menos de 1 minuto
            y toma mejores decisiones, todos los días.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px',
                  backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AhIconInline size={20} />
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
            © 2026 AHORIA · Finanzas personales inteligentes
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        {/* Mobile logo — only visible on small screens */}
        <div className="lg:hidden absolute top-6 left-6"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AhIconInline size={28} />
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#1F2937', letterSpacing: '-0.3px' }}>
            AHORIA
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
