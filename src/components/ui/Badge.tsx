'use client'

import React from 'react'

export interface BadgeProps {
  variant?: 'default' | 'wine' | 'sage' | 'gold' | 'accent'
  children: React.ReactNode
  className?: string
}

const variantClasses = {
  default: 'bg-light-surface dark:bg-dark-surface text-black dark:text-white border border-gray-300 dark:border-gray-600',
  wine: 'bg-wine/20 text-wine dark:text-wine border border-wine/30',
  sage: 'bg-sage/20 text-sage dark:text-sage border border-sage/30',
  gold: 'bg-gold/20 text-gold dark:text-gold border border-gold/30',
  accent: 'bg-accent-light/20 dark:bg-accent-dark/20 text-accent-light dark:text-accent-dark border border-accent-light/30 dark:border-accent-dark/30',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
