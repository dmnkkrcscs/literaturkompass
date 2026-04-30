'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Menu, X, Sun, Moon, Home, Search, Star, Clock, Trophy, Globe, BarChart3, BookOpen, Filter, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const navLinks = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/entdecken', label: 'Entdecken', icon: Search },
  { href: '/triage', label: 'Triage', icon: Filter },
  { href: '/geplant', label: 'Geplant', icon: Star },
  { href: '/offen', label: 'Offen', icon: Clock },
  { href: '/hall-of-fame', label: 'Hall of Fame', icon: Trophy },
  { href: '/absagen', label: 'Absagen', icon: XCircle },
  { href: '/zeitschriften', label: 'Zeitschriften', icon: BookOpen },
  { href: '/quellen', label: 'Quellen', icon: Globe },
  { href: '/statistiken', label: 'Statistiken', icon: BarChart3 },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="sticky top-0 z-40 bg-light-surface dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-accent-light dark:text-accent-dark hover:opacity-80 transition-opacity"
          >
            <span>📚</span>
            <span>Literaturkompass</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'text-accent-light dark:text-accent-dark bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-700 dark:text-gray-300 hover:text-accent-light dark:hover:text-accent-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Theme Toggle & Mobile Menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2"
            >
              {!mounted ? (
                <Moon className="h-5 w-5" />
              ) : resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2"
              aria-label="Toggle mobile menu"
            >
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-gray-200 dark:border-gray-700">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors block w-full ${
                  isActive(href)
                    ? 'text-accent-light dark:text-accent-dark bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-700 dark:text-gray-300 hover:text-accent-light dark:hover:text-accent-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
