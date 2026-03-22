'use client'

import React from 'react'
import { Badge } from '@/components/ui/Badge'

export interface StatsBarProps {
  total: number
  wettbewerbe: number
  anthologien: number
  zeitschriften: number
  offeneFristen: number
  geplant: number
}

export function StatsBar({
  total,
  wettbewerbe,
  anthologien,
  zeitschriften,
  offeneFristen,
  geplant,
}: StatsBarProps) {
  const stats = [
    { label: 'Gesamt', value: total, variant: 'default' as const },
    { label: 'Wettbewerbe', value: wettbewerbe, variant: 'wine' as const },
    { label: 'Anthologien', value: anthologien, variant: 'sage' as const },
    { label: 'Zeitschriften', value: zeitschriften, variant: 'gold' as const },
    { label: 'Offene Fristen', value: offeneFristen, variant: 'default' as const },
    { label: 'Geplant', value: geplant, variant: 'default' as const },
  ]

  return (
    <div className="bg-light-surface dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
              <Badge variant={stat.variant} className="font-semibold">
                {stat.value}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
