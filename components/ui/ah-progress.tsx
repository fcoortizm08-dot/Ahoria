'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ProgressSize = 'sm' | 'md' | 'lg'

interface AhProgressProps {
  value: number
  color?: string
  size?: ProgressSize
  animated?: boolean
  label?: string
  showValue?: boolean
  className?: string
}

const SIZE_MAP: Record<ProgressSize, number> = {
  sm: 4,
  md: 6,
  lg: 10,
}

export function AhProgress({
  value,
  color = '#10B981',
  size = 'md',
  animated = false,
  label,
  showValue = false,
  className,
}: AhProgressProps) {
  const [width, setWidth] = useState(0)
  const clamped = Math.max(0, Math.min(100, value))
  const height = SIZE_MAP[size]

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(clamped))
    return () => cancelAnimationFrame(id)
  }, [clamped])

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          {label && (
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>{label}</span>
          )}
          {showValue && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginLeft: 'auto' }}>
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#F3F4F6',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            backgroundColor: color,
            borderRadius: '999px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundImage: animated
              ? `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,255,255,0.2) 10px,
                  rgba(255,255,255,0.2) 20px
                )`
              : undefined,
            backgroundSize: animated ? '40px 40px' : undefined,
            animation: animated ? 'ah-progress-stripes 1s linear infinite' : undefined,
          }}
        />
      </div>
      <style>{`
        @keyframes ah-progress-stripes {
          from { background-position: 0 0; }
          to   { background-position: 40px 0; }
        }
      `}</style>
    </div>
  )
}

export default AhProgress
