'use client'

import React from 'react'
import { CompetitionCard, CompetitionCardProps } from './CompetitionCard'

export interface CompetitionListProps {
  competitions: CompetitionCardProps[]
  loading?: boolean
  emptyMessage?: string
  onStar?: (id: string, starred: boolean) => void
  onDismiss?: (id: string) => void
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-lit-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-400 dark:border-l-gray-500 p-4 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
          </div>
        </div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32 ml-auto"></div>
        </div>
      </div>
    </div>
  )
}

export function CompetitionList({
  competitions,
  loading = false,
  emptyMessage = 'Keine Ergebnisse gefunden.',
  onStar,
  onDismiss,
}: CompetitionListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="rounded-lg bg-lit-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {competitions.map((competition) => (
        <CompetitionCard
          key={competition.id}
          {...competition}
          onStar={onStar}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
