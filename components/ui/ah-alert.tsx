'use client'

import { useState, ReactNode, ReactElement } from 'react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AhAlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  dismissible?: boolean
  icon?: ReactNode
  className?: string
}

const VARIANT_CONFIG: Record<AlertVariant, {
  bg: string
  border: string
  leftBorder: string
  titleColor: string
  messageColor: string
  iconColor: string
  Icon: () => ReactElement
}> = {
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    leftBorder: '#3B82F6',
    titleColor: '#1D4ED8',
    messageColor: '#1E40AF',
    iconColor: '#3B82F6',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  success: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    leftBorder: '#10B981',
    titleColor: '#065F46',
    messageColor: '#047857',
    iconColor: '#10B981',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    leftBorder: '#F59E0B',
    titleColor: '#92400E',
    messageColor: '#B45309',
    iconColor: '#F59E0B',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
      </svg>
    ),
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    leftBorder: '#EF4444',
    titleColor: '#7F1D1D',
    messageColor: '#991B1B',
    iconColor: '#EF4444',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
        <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
      </svg>
    ),
  },
}

export function AhAlert({
  variant = 'info',
  title,
  message,
  dismissible = false,
  icon,
  className,
}: AhAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const cfg = VARIANT_CONFIG[variant]
  const IconComp = cfg.Icon

  return (
    <div
      className={cn('rounded-xl relative', className)}
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.leftBorder}`,
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ color: cfg.iconColor, flexShrink: 0, marginTop: '1px' }}>
          {icon ?? <IconComp />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <p style={{ fontSize: '13px', fontWeight: 700, color: cfg.titleColor, margin: '0 0 2px' }}>
              {title}
            </p>
          )}
          <p style={{ fontSize: '12px', color: cfg.messageColor, margin: 0, lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: cfg.iconColor,
              padding: '0',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default AhAlert
