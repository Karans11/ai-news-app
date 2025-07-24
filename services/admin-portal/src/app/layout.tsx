import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

// Use Inter font from Google Fonts (widely supported)
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI News Admin Portal',
  description: 'Manage your AI news content and automation',
  keywords: ['AI', 'News', 'Admin', 'Automation'],
  authors: [{ name: 'AI News Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}