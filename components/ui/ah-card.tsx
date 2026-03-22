import { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'elevated' | 'flat' | 'tinted' | 'glass'

interface AhCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  color?: string
  children?: ReactNode
}

const VARIANT_STYLES: Record<Exclude<CardVariant, 'tinted' | 'glass'>, React.CSSProperties> = {
  default: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  elevated: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  flat: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: 'none',
  },
}

export function AhCard({ variant = 'default', color, children, className, style, ...props }: AhCardProps) {
  let cardStyle: React.CSSProperties = {}

  if (variant === 'tinted' && color) {
    cardStyle = {
      backgroundColor: color + '08',
      border: `1px solid ${color}20`,
      boxShadow: 'none',
    }
  } else if (variant === 'glass') {
    cardStyle = {
      backgroundColor: 'rgba(255,255,255,0.7)',
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }
  } else if (variant !== 'tinted') {
    cardStyle = VARIANT_STYLES[variant]
  }

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{ ...cardStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

// ── AhCardHeader ─────────────────────────────────────────────────────────────

interface AhCardHeaderProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function AhCardHeader({ title, subtitle, action, className }: AhCardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4', className)}
      style={{ padding: '20px 20px 0' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0', fontWeight: 400 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ── AhCardBody ────────────────────────────────────────────────────────────────

interface AhCardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  noPadding?: boolean
}

export function AhCardBody({ children, noPadding, className, style, ...props }: AhCardBodyProps) {
  return (
    <div
      className={className}
      style={{ padding: noPadding ? '0' : '20px', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

// ── AhCardFooter ─────────────────────────────────────────────────────────────

interface AhCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export function AhCardFooter({ children, className, style, ...props }: AhCardFooterProps) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2', className)}
      style={{
        padding: '12px 20px',
        borderTop: '1px solid #E5E7EB',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default AhCard
