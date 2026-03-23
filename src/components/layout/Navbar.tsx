'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Menu, X, Sun, Moon, Settings, Globe } from 'lucide-react'

const mainNavLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/entdecken', label: 'Entdecken' },
  { href: '/geplant', label: 'Geplant' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/statistiken', label: 'Statistiken' },
]

const mobileExtraLinks = [
  { href: '/quellen', label: 'Quellen', icon: Globe },
  { href: '/einstellungen', label: 'Einstellungen', icon: Settings },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* Thin gradient accent bar */}
      <div
        className="h-[3px] w-full"
        style={{ background: 'linear-gradient(90deg, #be2d2b 0%, #6c5ce7 50%, #2a7d5e 100%)' }}
      />

      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <span
                className="text-[17px] font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #be2d2b 0%, #6c5ce7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Literaturkompass
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              {mainNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3.5 py-4 text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'text-accent dark:text-accent-light'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {label}
                  {isActive(href) && (
                    <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full bg-accent" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1">
              {/* Quellen icon — desktop only */}
              <Link
                href="/quellen"
                aria-label="Quellen"
                className={`hidden lg:flex p-2 rounded-lg transition-colors ${
                  isActive('/quellen')
                    ? 'text-accent bg-accent/10'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Globe className="h-4 w-4" />
              </Link>

              {/* Settings icon — desktop only */}
              <Link
                href="/einstellungen"
                aria-label="Einstellungen"
                className={`hidden lg:flex p-2 rounded-lg transition-colors ${
                  isActive('/einstellungen')
                    ? 'text-accent bg-accent/10'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="h-4 w-4" />
              </Link>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Theme wechseln"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Menü öffnen"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface divide-y divide-gray-50 dark:divide-dark-border">
            {[...mainNavLinks, ...mobileExtraLinks].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-5 py-3 text-sm font-medium border-l-[3px] transition-colors ${
                  isActive(href)
                    ? 'border-l-accent text-accent dark:text-accent-light bg-accent/5'
                    : 'border-l-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
