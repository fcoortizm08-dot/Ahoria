'use client'

import { useState } from 'react'
import { AhButton } from '@/components/ui/ah-button'
import { AhBadge } from '@/components/ui/ah-badge'
import { AhInput, AhSelect, AhTextarea } from '@/components/ui/ah-input'
import { AhCard, AhCardHeader, AhCardBody, AhCardFooter } from '@/components/ui/ah-card'
import { AhKpi } from '@/components/ui/ah-kpi'
import { AhProgress } from '@/components/ui/ah-progress'
import { AhAlert } from '@/components/ui/ah-alert'
import { AhSkeleton, AhSkeletonKpi, AhSkeletonCard, AhSkeletonText, AhSkeletonAvatar, AhSkeletonRow } from '@/components/ui/ah-skeleton'
import { AhAvatar, AhAvatarGroup } from '@/components/ui/ah-avatar'
import { AhEmpty } from '@/components/ui/ah-empty'
import { AhModal } from '@/components/ui/ah-modal'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ marginBottom: '64px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={{
      backgroundColor: '#F3F4F6',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '11px',
      color: '#374151',
      overflowX: 'auto',
      marginTop: '8px',
      lineHeight: 1.6,
      fontFamily: "'SF Mono', 'Fira Code', monospace",
    }}>
      <code>{code}</code>
    </pre>
  )
}

function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </div>
  )
}

// ── Color swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ name, hex, textDark = false }: { name: string; hex: string; textDark?: boolean }) {
  return (
    <div style={{
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
    }}>
      <div style={{ backgroundColor: hex, height: '56px' }} />
      <div style={{ padding: '8px 10px', backgroundColor: '#FFFFFF' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{name}</div>
        <div style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace' }}>{hex}</div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'typography', label: 'Tipografía' },
  { id: 'buttons', label: 'Botones' },
  { id: 'badges', label: 'Badges' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'cards', label: 'Cards' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'progress', label: 'Progress' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'skeletons', label: 'Skeletons' },
  { id: 'empty', label: 'Empty States' },
  { id: 'modal', label: 'Modal' },
  { id: 'patterns', label: 'Patterns' },
]

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [activeSection, setActiveSection] = useState('tokens')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FA' }}>
      {/* Top header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '24px 40px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '18px',
            }}>
              A
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.4px' }}>
                  AHO<span style={{ color: '#10B981' }}>RIA</span>{' '}
                  <span style={{ fontWeight: 500, color: '#9CA3AF' }}>Design System</span>
                </h1>
                <AhBadge variant="ai" size="sm">v1.0</AhBadge>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                Componentes, tokens y patrones para AHORIA
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: activeSection === s.id ? 700 : 500,
                  color: activeSection === s.id ? '#10B981' : '#6B7280',
                  textDecoration: 'none',
                  borderBottom: activeSection === s.id ? '2px solid #10B981' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>

        {/* ── SECTION 1: TOKENS ── */}
        <Section id="tokens" title="Design Tokens" subtitle="Paleta de colores, espaciado y sombras base del sistema">
          <Subsection title="Paleta de colores">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              <ColorSwatch name="Background" hex="#F7F8FA" />
              <ColorSwatch name="Surface" hex="#FFFFFF" />
              <ColorSwatch name="Surface 2" hex="#F3F4F6" />
              <ColorSwatch name="Border" hex="#E5E7EB" />
              <ColorSwatch name="Income" hex="#10B981" />
              <ColorSwatch name="Income Dark" hex="#059669" />
              <ColorSwatch name="Income Bg" hex="#ECFDF5" />
              <ColorSwatch name="Expense" hex="#EF4444" />
              <ColorSwatch name="Expense Dark" hex="#DC2626" />
              <ColorSwatch name="Expense Bg" hex="#FEF2F2" />
              <ColorSwatch name="Goal" hex="#3B82F6" />
              <ColorSwatch name="Goal Bg" hex="#EFF6FF" />
              <ColorSwatch name="Debt" hex="#F59E0B" />
              <ColorSwatch name="Debt Dark" hex="#D97706" />
              <ColorSwatch name="Debt Bg" hex="#FFFBEB" />
              <ColorSwatch name="AI" hex="#8B5CF6" />
              <ColorSwatch name="AI Bg" hex="#F5F3FF" />
              <ColorSwatch name="Text Primary" hex="#111827" />
              <ColorSwatch name="Text Secondary" hex="#6B7280" />
              <ColorSwatch name="Text Tertiary" hex="#9CA3AF" />
            </div>
          </Subsection>

          <Subsection title="Sombras">
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'xs', shadow: '0 1px 4px rgba(0,0,0,0.06)' },
                { label: 'md', shadow: '0 4px 16px rgba(0,0,0,0.08)' },
                { label: 'xl', shadow: '0 20px 60px rgba(0,0,0,0.12)' },
              ].map(s => (
                <div key={s.label} style={{
                  width: 120,
                  height: 80,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: s.shadow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>shadow-{s.label}</span>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Border Radius">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {[
                { label: '4px', r: '4px' },
                { label: '8px', r: '8px' },
                { label: '12px', r: '12px' },
                { label: '16px', r: '16px' },
                { label: '20px (2xl)', r: '20px' },
                { label: '999px (full)', r: '999px' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: item.r,
                    marginBottom: '6px',
                  }} />
                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </Subsection>
        </Section>

        {/* ── SECTION 2: TYPOGRAPHY ── */}
        <Section id="typography" title="Tipografía" subtitle="Escala tipográfica de AHORIA">
          {[
            { label: 'Display', size: '40px', weight: 900, sample: 'Finanzas inteligentes' },
            { label: 'H1', size: '32px', weight: 800, sample: 'Tu resumen financiero' },
            { label: 'H2', size: '24px', weight: 700, sample: 'Movimientos del mes' },
            { label: 'H3', size: '20px', weight: 600, sample: 'Categorías de gasto' },
            { label: 'Body Large', size: '16px', weight: 400, sample: 'Texto de párrafo y descripciones largas de contenido.' },
            { label: 'Body', size: '14px', weight: 400, sample: 'Texto de párrafo estándar para la mayoría del contenido.' },
            { label: 'Small', size: '12px', weight: 400, sample: 'Texto pequeño para metadata, fechas, etiquetas secundarias.' },
            { label: 'Label', size: '11px', weight: 700, sample: 'ETIQUETA DE SECCIÓN', upper: true },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '20px',
                padding: '16px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ width: '100px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: item.size,
                  fontWeight: item.weight,
                  color: '#111827',
                  letterSpacing: item.upper ? '0.8px' : (parseInt(item.size) >= 24 ? '-0.4px' : 'normal'),
                  textTransform: item.upper ? 'uppercase' : undefined,
                }}>
                  {item.sample}
                </span>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  {item.size} / {item.weight}
                </span>
              </div>
            </div>
          ))}
        </Section>

        {/* ── SECTION 3: BUTTONS ── */}
        <Section id="buttons" title="Botones" subtitle="Variantes, tamaños y estados">
          <Subsection title="Variantes">
            <Row wrap>
              <AhButton variant="primary">Primary</AhButton>
              <AhButton variant="secondary">Secondary</AhButton>
              <AhButton variant="danger">Danger</AhButton>
              <AhButton variant="ghost">Ghost</AhButton>
              <AhButton variant="outline">Outline</AhButton>
              <AhButton variant="link">Link</AhButton>
            </Row>
            <CodeBlock code={`<AhButton variant="primary">Primary</AhButton>
<AhButton variant="secondary">Secondary</AhButton>
<AhButton variant="danger">Danger</AhButton>
<AhButton variant="ghost">Ghost</AhButton>
<AhButton variant="outline">Outline</AhButton>
<AhButton variant="link">Link</AhButton>`} />
          </Subsection>

          <Subsection title="Tamaños">
            <Row>
              <AhButton size="sm">Small</AhButton>
              <AhButton size="md">Medium</AhButton>
              <AhButton size="lg">Large</AhButton>
            </Row>
          </Subsection>

          <Subsection title="Estados">
            <Row>
              <AhButton loading>Cargando...</AhButton>
              <AhButton disabled>Deshabilitado</AhButton>
              <AhButton variant="secondary" loading>Guardando</AhButton>
              <AhButton variant="danger" disabled>Eliminar</AhButton>
            </Row>
          </Subsection>
        </Section>

        {/* ── SECTION 4: BADGES ── */}
        <Section id="badges" title="Badges" subtitle="Etiquetas de estado y categoría">
          <Subsection title="Variantes">
            <Row wrap>
              <AhBadge variant="income">Ingreso</AhBadge>
              <AhBadge variant="expense">Gasto</AhBadge>
              <AhBadge variant="debt">Deuda</AhBadge>
              <AhBadge variant="goal">Meta</AhBadge>
              <AhBadge variant="ai">IA</AhBadge>
              <AhBadge variant="success">Completado</AhBadge>
              <AhBadge variant="warning">Pendiente</AhBadge>
              <AhBadge variant="error">Error</AhBadge>
              <AhBadge variant="neutral">Neutral</AhBadge>
              <AhBadge variant="pro">PRO</AhBadge>
            </Row>
          </Subsection>

          <Subsection title="Con punto">
            <Row wrap>
              <AhBadge variant="income" dot>Activo</AhBadge>
              <AhBadge variant="expense" dot>Vencido</AhBadge>
              <AhBadge variant="debt" dot>En progreso</AhBadge>
              <AhBadge variant="neutral" dot>Inactivo</AhBadge>
            </Row>
          </Subsection>

          <Subsection title="Tamaños">
            <Row>
              <AhBadge variant="goal" size="sm">Small</AhBadge>
              <AhBadge variant="goal" size="md">Medium</AhBadge>
              <AhBadge variant="goal" size="lg">Large</AhBadge>
            </Row>
          </Subsection>
        </Section>

        {/* ── SECTION 5: INPUTS ── */}
        <Section id="inputs" title="Inputs" subtitle="Campos de formulario con estados y variantes">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <AhInput label="Nombre completo" placeholder="Francisco Ortiz" />
            <AhInput label="Email" type="email" placeholder="hola@ahoria.cl" helper="Nunca compartiremos tu email" />
            <AhInput
              label="Monto"
              type="number"
              placeholder="50000"
              prefix="$"
              helper="Ingresa el monto en CLP"
            />
            <AhInput
              label="Con error"
              placeholder="Escribe algo..."
              error="Este campo es requerido"
            />
            <AhInput label="Deshabilitado" value="No editable" disabled readOnly />
            <AhInput label="Con sufijo" placeholder="ejemplo" suffix=".cl" />
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <AhSelect label="Categoría">
              <option value="">Selecciona una categoría</option>
              <option value="food">Alimentación</option>
              <option value="transport">Transporte</option>
              <option value="health">Salud</option>
            </AhSelect>
            <AhTextarea
              label="Descripción"
              placeholder="Describe la transacción..."
              helper="Opcional, máx. 200 caracteres"
            />
          </div>

          <CodeBlock code={`<AhInput label="Monto" prefix="$" error="Campo requerido" />
<AhSelect label="Categoría"><option>...</option></AhSelect>
<AhTextarea label="Notas" helper="Opcional" />`} />
        </Section>

        {/* ── SECTION 6: CARDS ── */}
        <Section id="cards" title="Cards" subtitle="Contenedores de contenido con variantes visuales">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <AhCard variant="default">
              <AhCardHeader title="Default" subtitle="border + subtle shadow" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  Card base del sistema. Usar para la mayoría del contenido.
                </p>
              </AhCardBody>
            </AhCard>

            <AhCard variant="elevated">
              <AhCardHeader title="Elevated" subtitle="shadow más prominente" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  Para elementos destacados o modales inline.
                </p>
              </AhCardBody>
            </AhCard>

            <AhCard variant="flat">
              <AhCardHeader title="Flat" subtitle="solo border, sin sombra" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  Para layouts densos donde las sombras generan ruido.
                </p>
              </AhCardBody>
            </AhCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <AhCard variant="tinted" color="#10B981">
              <AhCardHeader title="Tinted Green" subtitle="tinte con color de ingreso" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#065F46', margin: 0 }}>
                  Para destacar información positiva o de ingresos.
                </p>
              </AhCardBody>
            </AhCard>

            <AhCard variant="tinted" color="#3B82F6">
              <AhCardHeader title="Tinted Blue" subtitle="tinte con color de metas" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#1E40AF', margin: 0 }}>
                  Para metas, proyecciones e info neutral.
                </p>
              </AhCardBody>
            </AhCard>

            <AhCard variant="tinted" color="#F59E0B">
              <AhCardHeader title="Tinted Amber" subtitle="tinte con color de deuda" />
              <AhCardBody>
                <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>
                  Para alertas suaves y deudas pendientes.
                </p>
              </AhCardBody>
            </AhCard>
          </div>
        </Section>

        {/* ── SECTION 7: KPI CARDS ── */}
        <Section id="kpis" title="KPI Cards" subtitle="Métricas clave con íconos y tendencias">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <AhKpi
              label="Ingresos"
              value="$4.200.000"
              sub="Marzo 2026"
              color="#10B981"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round"/>
                </svg>
              }
              trend={{ value: 12, label: 'vs mes anterior' }}
            />
            <AhKpi
              label="Gastos"
              value="$2.850.000"
              sub="Marzo 2026"
              color="#EF4444"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              }
              trend={{ value: -5, label: 'vs mes anterior' }}
            />
            <AhKpi
              label="Balance"
              value="$1.350.000"
              sub="Disponible"
              color="#3B82F6"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              trend={{ value: 8, label: 'tasa de ahorro' }}
            />
            <AhKpi
              label="Health Score"
              value="82/100"
              sub="Excelente"
              color="#8B5CF6"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              }
            />
          </div>

          <Subsection title="Compact">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <AhKpi label="Deudas" value="3" sub="activas" color="#F59E0B" compact />
              <AhKpi label="Metas" value="5" sub="en curso" color="#3B82F6" compact />
              <AhKpi label="Racha" value="12 días" color="#10B981" compact />
              <AhKpi label="Proyección" value="$3.4M" sub="fin de mes" color="#EF4444" compact />
            </div>
          </Subsection>
        </Section>

        {/* ── SECTION 8: PROGRESS ── */}
        <Section id="progress" title="Progress Bars" subtitle="Barras de progreso para metas y presupuestos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
            <AhProgress value={72} color="#10B981" label="Meta de ahorro" showValue />
            <AhProgress value={45} color="#3B82F6" label="Meta viaje Europa" showValue size="md" />
            <AhProgress value={88} color="#EF4444" label="Presupuesto alimentación" showValue />
            <AhProgress value={30} color="#F59E0B" label="Deuda cuota 3/10" showValue />
            <AhProgress value={60} color="#8B5CF6" animated label="Procesando..." showValue />

            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Tamaños</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AhProgress value={65} color="#10B981" size="sm" label="sm (4px)" />
                <AhProgress value={65} color="#10B981" size="md" label="md (6px)" />
                <AhProgress value={65} color="#10B981" size="lg" label="lg (10px)" />
              </div>
            </div>
          </div>
          <CodeBlock code={`<AhProgress value={72} color="#10B981" label="Ahorro" showValue />
<AhProgress value={60} color="#8B5CF6" animated label="En proceso" />`} />
        </Section>

        {/* ── SECTION 9: ALERTS ── */}
        <Section id="alerts" title="Alertas" subtitle="Mensajes de feedback y notificaciones">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
            <AhAlert
              variant="info"
              title="Información"
              message="Tu cuenta ha sido verificada exitosamente. Ya puedes usar todas las funciones de AHORIA."
            />
            <AhAlert
              variant="success"
              title="¡Meta alcanzada!"
              message="Lograste tu meta de ahorro de $500.000 para el viaje a Europa. ¡Felicitaciones!"
            />
            <AhAlert
              variant="warning"
              title="Atención"
              message="Tu presupuesto de Alimentación está al 88%. Considera reducir gastos los próximos días."
              dismissible
            />
            <AhAlert
              variant="error"
              title="Error de conexión"
              message="No se pudo sincronizar con el servidor. Verifica tu conexión a internet e intenta de nuevo."
              dismissible
            />
          </div>
          <CodeBlock code={`<AhAlert variant="success" title="Meta alcanzada" message="..." />
<AhAlert variant="warning" message="..." dismissible />`} />
        </Section>

        {/* ── SECTION 10: AVATARS ── */}
        <Section id="avatars" title="Avatars" subtitle="Representación visual de usuarios">
          <Subsection title="Tamaños">
            <Row>
              <AhAvatar name="Francisco Ortiz" size="sm" />
              <AhAvatar name="Francisco Ortiz" size="md" />
              <AhAvatar name="Francisco Ortiz" size="lg" />
              <AhAvatar name="Francisco Ortiz" size="xl" />
            </Row>
          </Subsection>

          <Subsection title="Con colores personalizados">
            <Row>
              <AhAvatar name="Ana García" color="#10B981" size="md" />
              <AhAvatar name="Luis Rojas" color="#3B82F6" size="md" />
              <AhAvatar name="María López" color="#8B5CF6" size="md" />
              <AhAvatar name="Carlos Vega" color="#F59E0B" size="md" />
              <AhAvatar name="Sofía Díaz" color="#EF4444" size="md" />
            </Row>
          </Subsection>

          <Subsection title="Avatar Group">
            <AhAvatarGroup
              size="md"
              avatars={[
                { name: 'Francisco Ortiz' },
                { name: 'Ana García', color: '#10B981' },
                { name: 'Luis Rojas', color: '#3B82F6' },
                { name: 'María López', color: '#8B5CF6' },
                { name: 'Carlos Vega', color: '#F59E0B' },
                { name: 'Sofía Díaz', color: '#EF4444' },
              ]}
              max={4}
            />
          </Subsection>

          <CodeBlock code={`<AhAvatar name="Francisco Ortiz" size="md" />
<AhAvatarGroup avatars={[...]} max={4} />`} />
        </Section>

        {/* ── SECTION 11: SKELETONS ── */}
        <Section id="skeletons" title="Skeletons" subtitle="Estados de carga para todos los componentes">
          <Subsection title="KPI skeleton (3 columnas)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <AhSkeletonKpi />
              <AhSkeletonKpi />
              <AhSkeletonKpi />
            </div>
          </Subsection>

          <Subsection title="Card skeletons">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <AhSkeletonCard height={180} />
              <AhSkeletonCard height={180} />
            </div>
          </Subsection>

          <Subsection title="Rows (lista de transacciones)">
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '8px 16px' }}>
              <AhSkeletonRow />
              <AhSkeletonRow />
              <AhSkeletonRow />
              <AhSkeletonRow />
            </div>
          </Subsection>

          <Subsection title="Componentes base">
            <Row wrap>
              <AhSkeletonAvatar size={40} />
              <AhSkeletonAvatar size={32} />
              <div style={{ flex: 1 }}>
                <AhSkeletonText lines={2} />
              </div>
              <AhSkeleton width={80} height={28} />
            </Row>
          </Subsection>
        </Section>

        {/* ── SECTION 12: EMPTY STATES ── */}
        <Section id="empty" title="Empty States" subtitle="Pantallas vacías con y sin acción">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <AhCard variant="default">
              <AhEmpty
                emoji="💸"
                title="Sin transacciones aún"
                description="Registra tu primer ingreso o gasto para comenzar a ver tu resumen financiero."
                action={<AhButton size="sm">Agregar transacción</AhButton>}
              />
            </AhCard>

            <AhCard variant="default">
              <AhEmpty
                emoji="🎯"
                title="Sin metas activas"
                description="Crea tu primera meta de ahorro y comienza a planificar tu futuro."
                action={<AhButton size="sm" variant="outline">Crear meta</AhButton>}
              />
            </AhCard>

            <AhCard variant="default">
              <AhEmpty
                emoji="📊"
                title="No hay datos para este período"
                description="Selecciona un período diferente o agrega movimientos."
                compact
              />
            </AhCard>

            <AhCard variant="default">
              <AhEmpty
                emoji="🔍"
                title="Sin resultados"
                description='No encontramos resultados para "café". Intenta con otro término.'
                compact
              />
            </AhCard>
          </div>
        </Section>

        {/* ── SECTION 13: MODAL ── */}
        <Section id="modal" title="Modal" subtitle="Diálogos con portal, blur backdrop y animación">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <AhButton onClick={() => setModalOpen(true)}>Abrir modal</AhButton>
            <AhButton variant="outline" onClick={() => setModalOpen(true)}>Modal outline</AhButton>
          </div>

          <div style={{ marginTop: '16px' }}>
            <AhCard variant="elevated" style={{ maxWidth: '540px' }}>
              <AhCardHeader
                title="Agregar ingreso"
                subtitle="Registra un nuevo ingreso en tu cuenta"
                action={
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
                    </svg>
                  </div>
                }
              />
              <AhCardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <AhInput
                    label="Descripción"
                    placeholder="Ej: Sueldo enero"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                  />
                  <AhInput label="Monto" type="number" prefix="$" placeholder="500000" />
                  <AhSelect label="Categoría">
                    <option>Salario</option>
                    <option>Freelance</option>
                    <option>Inversión</option>
                  </AhSelect>
                </div>
              </AhCardBody>
              <AhCardFooter>
                <AhButton variant="secondary" size="sm">Cancelar</AhButton>
                <AhButton size="sm">Guardar ingreso</AhButton>
              </AhCardFooter>
            </AhCard>
          </div>

          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px' }}>
            ↑ Preview estático. Haz clic en "Abrir modal" para ver el componente real con portal + backdrop.
          </p>

          <CodeBlock code={`<AhModal
  open={open}
  onClose={() => setOpen(false)}
  title="Agregar ingreso"
  subtitle="Registra un nuevo ingreso"
  footer={<>
    <AhButton variant="secondary">Cancelar</AhButton>
    <AhButton>Guardar</AhButton>
  </>}
>
  {/* form content */}
</AhModal>`} />

          <AhModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Agregar ingreso"
            subtitle="Registra un nuevo ingreso en tu cuenta AHORIA"
            size="md"
            footer={
              <>
                <AhButton variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </AhButton>
                <AhButton onClick={() => setModalOpen(false)}>
                  Guardar ingreso
                </AhButton>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <AhInput label="Descripción" placeholder="Ej: Sueldo enero" />
              <AhInput label="Monto" type="number" prefix="$" placeholder="500000" />
              <AhSelect label="Categoría">
                <option>Salario</option>
                <option>Freelance</option>
                <option>Inversión</option>
              </AhSelect>
              <AhAlert variant="info" message="El ingreso se sumará al mes actual seleccionado." />
            </div>
          </AhModal>
        </Section>

        {/* ── SECTION 14: DATA PATTERNS ── */}
        <Section id="patterns" title="Data Patterns" subtitle="Patrones de UI recurrentes en la aplicación">
          <Subsection title="Fila de transacción">
            <AhCard variant="default">
              <AhCardBody noPadding>
                {[
                  { emoji: '🍕', label: 'Almuerzo trabajo', cat: 'Alimentación', date: 'Hoy', amount: '-$8.500', color: '#EF4444', variant: 'expense' as const },
                  { emoji: '💼', label: 'Sueldo marzo', cat: 'Salario', date: 'Hace 2 días', amount: '+$2.100.000', color: '#10B981', variant: 'income' as const },
                  { emoji: '🏠', label: 'Arriendo', cat: 'Vivienda', date: '01 Mar', amount: '-$420.000', color: '#EF4444', variant: 'expense' as const },
                  { emoji: '📈', label: 'Dividendos ETF', cat: 'Inversión', date: '28 Feb', amount: '+$45.000', color: '#10B981', variant: 'income' as const },
                ].map((tx, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: i < 3 ? '1px solid #F3F4F6' : 'none',
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: tx.color + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}>
                      {tx.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{tx.label}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{tx.cat}</span>
                        <span>·</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: tx.color }}>{tx.amount}</div>
                      <AhBadge variant={tx.variant} size="sm">{tx.variant === 'income' ? 'Ingreso' : 'Gasto'}</AhBadge>
                    </div>
                  </div>
                ))}
              </AhCardBody>
            </AhCard>
          </Subsection>

          <Subsection title="Fila de meta con progreso">
            <AhCard variant="default">
              <AhCardBody noPadding>
                {[
                  { emoji: '✈️', label: 'Viaje Europa', target: '$3.000.000', current: '$1.260.000', pct: 42, color: '#3B82F6' },
                  { emoji: '🏠', label: 'Fondo emergencia', target: '$1.200.000', current: '$960.000', pct: 80, color: '#10B981' },
                  { emoji: '💻', label: 'MacBook Pro', target: '$2.500.000', current: '$375.000', pct: 15, color: '#8B5CF6' },
                ].map((goal, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: goal.color + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}>
                        {goal.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{goal.label}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          {goal.current} de {goal.target}
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: goal.color }}>{goal.pct}%</span>
                    </div>
                    <AhProgress value={goal.pct} color={goal.color} size="sm" />
                  </div>
                ))}
              </AhCardBody>
            </AhCard>
          </Subsection>
        </Section>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '32px',
          borderTop: '1px solid #E5E7EB',
        }}>
          <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
            AHORIA Design System v1.0 — construido con Next.js + Tailwind CSS v4
          </p>
        </div>
      </div>
    </div>
  )
}
