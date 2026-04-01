import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'AHORIA — Finanzas personales inteligentes',
  description: 'Entiende tu situación financiera en menos de 1 minuto. Registra ingresos, gastos, metas y deudas en un solo lugar.',
  keywords:    ['finanzas personales', 'ahorro', 'presupuesto', 'gastos', 'ingresos', 'LATAM', 'Chile'],
  authors:     [{ name: 'AHORIA' }],
  creator:     'AHORIA',
  applicationName: 'AHORIA',
  manifest:    '/manifest.webmanifest',
  icons: {
    icon:    [
      { url: '/logos/ahoria-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico',           sizes: '32x32' },
    ],
    apple:   [{ url: '/logos/ahoria-icon-square.svg', sizes: '180x180', type: 'image/svg+xml' }],
    shortcut:[{ url: '/logos/ahoria-icon.svg' }],
  },
  openGraph: {
    title:       'AHORIA — Finanzas personales inteligentes',
    description: 'Entiende tu situación financiera en menos de 1 minuto.',
    type:        'website',
    locale:      'es_CL',
    siteName:    'AHORIA',
  },
  twitter: {
    card:        'summary',
    title:       'AHORIA',
    description: 'Entiende tu situación financiera en menos de 1 minuto.',
  },
}

export const viewport: Viewport = {
  themeColor:        '#5DBB63',
  colorScheme:       'light',
  width:             'device-width',
  initialScale:      1,
  maximumScale:      5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        {/* Inline favicon SVG — works in all modern browsers */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 72 L36 10 L46 10 L18 72 Z' fill='%235DBB63'/%3E%3Cpath d='M74 72 L46 10 L36 10 L60 72 Z' fill='%231B2E4B'/%3E%3Crect x='21' y='51' width='28' height='7' rx='1' fill='%234A90E2'/%3E%3Crect x='26' y='43' width='20' height='6' rx='1' fill='%234A90E2' opacity='0.75'/%3E%3Crect x='56' y='36' width='10' height='26' rx='2' fill='%234A90E2'/%3E%3Cpath d='M50 38 L61 18 L72 38 Z' fill='%234A90E2'/%3E%3C/svg%3E"
        />
        <meta name="msapplication-TileColor" content="#5DBB63" />
        <meta name="msapplication-TileImage" content="/logos/ahoria-icon-square.svg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
