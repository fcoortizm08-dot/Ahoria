'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useFinanceStore } from '@/store/useFinanceStore'

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
    ],
  },
  {
    label: 'Movimientos',
    items: [
      { href: '/income',   label: 'Ingresos', icon: '↑' },
      { href: '/expenses', label: 'Gastos',   icon: '↓' },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { href: '/goals', label: 'Metas',  icon: '◎' },
      { href: '/debts', label: 'Deudas', icon: '◫' },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { href: '/ai', label: 'Asistente IA', icon: '✦', isAI: true },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { href: '/settings', label: 'Configuración', icon: '⚙' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { href: '/design-system', label: 'Design System', icon: '◈', isDev: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const profile  = useFinanceStore(s => s.profile)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A'

  return (
    <aside
      style={{
        width: '240px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '16px',
            flexShrink: 0,
          }}>A</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
              AHO<span style={{ color: '#10B981' }}>RIA</span>
            </div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>
              Finanzas inteligentes
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: section.label ? '4px' : '0' }}>
            {section.label && (
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '8px 8px 4px',
              }}>
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href
              const isAI = (item as { isAI?: boolean }).isAI
              const isDev = (item as { isDev?: boolean }).isDev

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    color: isActive
                      ? (isAI ? '#7C3AED' : isDev ? '#6B7280' : '#059669')
                      : (isAI ? '#8B5CF6' : '#6B7280'),
                    backgroundColor: isActive
                      ? (isAI ? '#F5F3FF' : isDev ? '#F3F4F6' : '#ECFDF5')
                      : 'transparent',
                    borderLeft: isActive
                      ? `3px solid ${isAI ? '#8B5CF6' : isDev ? '#9CA3AF' : '#10B981'}`
                      : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '14px', width: '16px', textAlign: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isAI && !isActive && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      backgroundColor: '#F5F3FF',
                      color: '#8B5CF6',
                    }}>
                      IA
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 10px',
          borderRadius: '8px',
          marginBottom: '4px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #10B981, #3B82F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {profile?.full_name ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Plan Gratis</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            backgroundColor: 'transparent',
            color: '#6B7280',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            textAlign: 'center',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.backgroundColor = '#FEF2F2'
            el.style.borderColor = '#FECACA'
            el.style.color = '#DC2626'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.backgroundColor = 'transparent'
            el.style.borderColor = '#E5E7EB'
            el.style.color = '#6B7280'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
