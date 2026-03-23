import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Literaturkompass',
  description: 'Dein persönlicher Kompass durch die Welt der Literaturwettbewerbe, Anthologien und Zeitschriften.',
  keywords: ['Literatur', 'Wettbewerb', 'Anthologie', 'Zeitschrift', 'Schreiben', 'Einreichung'],
  authors: [{ name: 'Literaturkompass' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Albert+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col bg-lit-bg dark:bg-dark-bg">
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
