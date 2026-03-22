import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AhEmptyProps {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function AhEmpty({
  emoji = '📭',
  title,
  description,
  action,
  compact = false,
  className,
}: AhEmptyProps) {
  return (
    <div
      className={cn('flex flex-col items-center text-center', className)}
      style={{ padding: compact ? '24px 16px' : '48px 24px' }}
    >
      <div style={{
        fontSize: compact ? '32px' : '48px',
        lineHeight: 1,
        marginBottom: compact ? '10px' : '16px',
      }}>
        {emoji}
      </div>
      <h3 style={{
        fontSize: compact ? '14px' : '16px',
        fontWeight: 700,
        color: '#111827',
        margin: '0 0 6px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: compact ? '12px' : '13px',
          color: '#9CA3AF',
          margin: '0 0 16px',
          maxWidth: '280px',
          lineHeight: 1.6,
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: description ? '0' : '12px' }}>
          {action}
        </div>
      )}
    </div>
  )
}

export default AhEmpty
