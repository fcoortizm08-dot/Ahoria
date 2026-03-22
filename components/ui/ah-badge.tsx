import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'income'
  | 'expense'
  | 'debt'
  | 'goal'
  | 'ai'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'pro'

type BadgeSize = 'sm' | 'md' | 'lg'

interface AhBadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: ReactNode
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string; dot?: string }> = {
  income:  { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', dot: '#10B981' },
  expense: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  debt:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  goal:    { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' },
  ai:      { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6' },
  success: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', dot: '#10B981' },
  warning: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  error:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  neutral: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  pro:     { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6' },
}

const SIZE_STYLES: Record<BadgeSize, { fontSize: string; padding: string }> = {
  sm: { fontSize: '10px', padding: '1px 6px' },
  md: { fontSize: '12px', padding: '2px 8px' },
  lg: { fontSize: '13px', padding: '3px 10px' },
}

export function AhBadge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
}: AhBadgeProps) {
  const vs = VARIANT_STYLES[variant]
  const ss = SIZE_STYLES[size]

  const isGradientText = variant === 'pro'

  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full font-semibold', className)}
      style={{
        backgroundColor: vs.bg,
        border: `1px solid ${vs.border}`,
        fontSize: ss.fontSize,
        padding: ss.padding,
        color: isGradientText ? undefined : vs.color,
        background: isGradientText
          ? `linear-gradient(135deg, ${vs.bg}, ${vs.bg})`
          : vs.bg,
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '999px',
            backgroundColor: vs.dot,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      )}
      {isGradientText ? (
        <span
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
          }}
        >
          {children}
        </span>
      ) : (
        children
      )}
    </span>
  )
}

export default AhBadge
