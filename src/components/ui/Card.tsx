'use client'

import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  header?: React.ReactNode
  borderLeftColor?: 'wine' | 'sage' | 'gold' | 'none'
  padding?: 'sm' | 'md' | 'lg'
}

const borderColors = {
  wine: 'border-l-wine',
  sage: 'border-l-sage',
  gold: 'border-l-gold',
  none: '',
}

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  className = '',
  header,
  borderLeftColor = 'none',
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`rounded-lg bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700 ${borderLeftColor !== 'none' ? `border-l-4 ${borderColors[borderLeftColor]}` : ''} ${className}`}
    >
      {header && (
        <div className={`${paddingClasses[padding]} border-b border-gray-200 dark:border-gray-700`}>
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  )
}
