import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

const FONT_MAP: Record<AvatarSize, number> = {
  sm: 11,
  md: 13,
  lg: 16,
  xl: 20,
}

interface AhAvatarProps {
  name?: string
  src?: string
  size?: AvatarSize
  color?: string
  className?: string
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AhAvatar({
  name,
  src,
  size = 'md',
  color,
  className,
}: AhAvatarProps) {
  const px = SIZE_MAP[size]
  const fs = FONT_MAP[size]
  const initials = getInitials(name)

  const bgStyle = color
    ? { backgroundColor: color }
    : { background: 'linear-gradient(135deg, #10B981, #3B82F6)' }

  return (
    <div
      className={cn('relative flex-shrink-0 select-none overflow-hidden', className)}
      style={{
        width: px,
        height: px,
        borderRadius: '999px',
        ...bgStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          fill
          style={{ objectFit: 'cover' }}
          sizes={`${px}px`}
        />
      ) : (
        <span style={{
          fontSize: fs,
          fontWeight: 700,
          color: '#FFFFFF',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {initials}
        </span>
      )}
    </div>
  )
}

// ── AhAvatarGroup ─────────────────────────────────────────────────────────────

interface AhAvatarGroupProps {
  avatars: Array<{ name?: string; src?: string; color?: string }>
  size?: AvatarSize
  max?: number
  className?: string
}

export function AhAvatarGroup({
  avatars,
  size = 'md',
  max = 4,
  className,
}: AhAvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - visible.length
  const px = SIZE_MAP[size]

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((av, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -Math.floor(px * 0.35),
            zIndex: visible.length - i,
            border: '2px solid #FFFFFF',
            borderRadius: '999px',
          }}
        >
          <AhAvatar {...av} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            marginLeft: -Math.floor(px * 0.35),
            width: px,
            height: px,
            borderRadius: '999px',
            backgroundColor: '#E5E7EB',
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: FONT_MAP[size],
            fontWeight: 600,
            color: '#6B7280',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

export default AhAvatar
