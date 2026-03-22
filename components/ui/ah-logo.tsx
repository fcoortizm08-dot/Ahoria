import Image from 'next/image'
import Link from 'next/link'

type LogoVariant = 'icon' | 'icon-circle' | 'icon-square' | 'horizontal' | 'vertical' | 'white'

interface AhLogoProps {
  variant?: LogoVariant
  height?: number
  href?: string
  className?: string
  /** If true, wraps in a Next.js Link to href (default '/dashboard') */
  linked?: boolean
}

const LOGO_CONFIGS: Record<LogoVariant, { file: string; aspectRatio: number; alt: string }> = {
  'icon':         { file: '/logos/ahoria-icon.svg',            aspectRatio: 1,    alt: 'AHORIA' },
  'icon-circle':  { file: '/logos/ahoria-icon-circle.svg',     aspectRatio: 1,    alt: 'AHORIA' },
  'icon-square':  { file: '/logos/ahoria-icon-square.svg',     aspectRatio: 1,    alt: 'AHORIA' },
  'horizontal':   { file: '/logos/ahoria-logo-horizontal.svg', aspectRatio: 4.17, alt: 'AHORIA' },
  'vertical':     { file: '/logos/ahoria-logo-vertical.svg',   aspectRatio: 1.45, alt: 'AHORIA' },
  'white':        { file: '/logos/ahoria-logo-white.svg',      aspectRatio: 4.17, alt: 'AHORIA' },
}

export function AhLogo({
  variant = 'horizontal',
  height = 36,
  href = '/dashboard',
  className = '',
  linked = true,
}: AhLogoProps) {
  const cfg = LOGO_CONFIGS[variant]
  const width = Math.round(height * cfg.aspectRatio)

  const img = (
    <Image
      src={cfg.file}
      alt={cfg.alt}
      width={width}
      height={height}
      priority
      className={className}
      style={{ width, height, display: 'block' }}
    />
  )

  if (!linked) return img

  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {img}
    </Link>
  )
}

/** Inline SVG version of the icon — zero network request, best for sidebar/favicon */
export function AhIconInline({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AHORIA"
    >
      {/* Left leg — green */}
      <path d="M6 72 L36 10 L46 10 L18 72 Z" fill="#5DBB63" />
      {/* Right leg — navy */}
      <path d="M74 72 L46 10 L36 10 L60 72 Z" fill="#1B2E4B" />
      {/* Crossbar step 1 */}
      <rect x="21" y="51" width="28" height="7" rx="1" fill="#4A90E2" />
      {/* Crossbar step 2 */}
      <rect x="26" y="43" width="20" height="6" rx="1" fill="#4A90E2" opacity="0.75" />
      {/* Arrow shaft */}
      <rect x="56" y="36" width="10" height="26" rx="2" fill="#4A90E2" />
      {/* Arrow head */}
      <path d="M50 38 L61 18 L72 38 Z" fill="#4A90E2" />
    </svg>
  )
}

/** Inline wordmark — icon + AHORIA text, no image requests */
export function AhWordmarkInline({
  iconSize = 32,
  fontSize = 20,
  gap = 10,
  className = '',
}: {
  iconSize?: number
  fontSize?: number
  gap?: number
  className?: string
}) {
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap }}
    >
      <AhIconInline size={iconSize} />
      <span
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          color: '#1F2937',
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          lineHeight: 1,
        }}
      >
        AHORIA
      </span>
    </div>
  )
}
