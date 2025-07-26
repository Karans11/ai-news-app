import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Shorts - Quick AI News',
  description: 'Get your AI news in 60 seconds',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI Shorts',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'AI Shorts - Quick AI News',
    description: 'Get your AI news in 60 seconds',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AI Shorts',
    description: 'Get your AI news in 60 seconds',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="AI Bytes" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}