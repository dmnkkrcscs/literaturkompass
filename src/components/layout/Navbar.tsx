'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Menu, X, Sun, Moon,
  Home, Search, Filter, Star, Clock,
  Trophy, XCircle, BookOpen, Globe, BarChart3,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Items always visible in the desktop bar
const primaryLinks = [
  { href: '/',          label: 'Dashboard', icon: Home   },
  { href: '/entdecken', label: 'Entdecken', icon: Search },
  { href: '/triage',    label: 'Triage',    icon: Filter },
  { href: '/geplant',   label: 'Geplant',   icon: Star   },
  { href: '/offen',     label: 'Offen',     icon: Clock  },
]

// Items tucked into the "Mehr" dropdown
const secondaryLinks = [
  { href: '/hall-of-fame',  label: 'Hall of Fame',  icon: Trophy    },
  { href: '/absagen',       label: 'Absagen',        icon: XCircle   },
  { href: '/zeitschriften', label: 'Zeitschriften',  icon: BookOpen  },
  { href: '/quellen',       label: 'Quellen',        icon: Globe     },
  { href: '/statistiken',   label: 'Statistiken',    icon: BarChart3 },
]

const allLinks = [...primaryLinks, ...secondaryLinks]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen]     = useState(false)
  const [mounted, setMounted]       = useState(false)
  const pathname    = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Close "Mehr" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close "Mehr" on route change
  useEffect(() => { setMoreOpen(false); setMobileOpen(false) }, [pathname])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const anySecondaryActive = secondaryLinks.some(l => isActive(l.href))

  const linkCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'text-accent-light dark:text-accent-dark bg-gray-100 dark:bg-gray-800'
        : 'text-gray-600 dark:text-gray-400 hover:text-accent-light dark:hover:text-accent-dark hover:bg-gray-100 dark:hover:bg-gray-800'
    }`

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-light-surface shadow-sm dark:border-gray-700 dark:bg-dark-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-bold text-accent-light transition-opacity hover:opacity-80 dark:text-accent-dark"
          >
            <span>📚</span>
            <span className="hidden sm:inline">Literaturkompass</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {primaryLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={linkCls(isActive(href))}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            {/* Mehr dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(o => !o)}
                className={linkCls(anySecondaryActive && !moreOpen)}
              >
                {anySecondaryActive
                  ? (() => {
                      const active = secondaryLinks.find(l => isActive(l.href))
                      if (!active) return null
                      const Icon = active.icon
                      return <Icon className="h-4 w-4" />
                    })()
                  : null}
                {anySecondaryActive
                  ? secondaryLinks.find(l => isActive(l.href))?.label
                  : 'Mehr'}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700 dark:bg-dark-surface">
                  {secondaryLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                        isActive(href)
                          ? 'bg-gray-100 font-medium text-accent-light dark:bg-gray-800 dark:text-accent-dark'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: theme + mobile toggle */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="p-2"
            >
              {!mounted ? <Moon className="h-5 w-5" /> : resolvedTheme === 'dark'
                ? <Sun className="h-5 w-5" />
                : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(o => !o)}
              className="p-2 md:hidden"
              aria-label="Menü öffnen"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-gray-200 pb-3 pt-2 dark:border-gray-700 md:hidden">
            {/* Group: Kern */}
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Kern
            </p>
            {primaryLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-gray-100 text-accent-light dark:bg-gray-800 dark:text-accent-dark'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            {/* Group: Mehr */}
            <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Mehr
            </p>
            {secondaryLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-gray-100 text-accent-light dark:bg-gray-800 dark:text-accent-dark'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
