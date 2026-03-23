'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Bookmark, X, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export interface CompetitionCardProps {
  id: string
  type: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
  name: string
  organizer?: string | null
  deadline?: Date | null
  theme?: string | null
  genres: string[]
  prize?: string | null
  maxLength?: string | null
  url: string
  starred?: boolean
  planned?: boolean
  relevanceScore?: number | null
  onStar?: (id: string, starred: boolean) => void
  onDismiss?: (id: string) => void
  onPlan?: (id: string, planned: boolean) => void
}

const typeConfig = {
  WETTBEWERB: {
    label: 'Wettbewerb',
    bg: 'bg-wine/10 dark:bg-wine/20',
    text: 'text-wine dark:text-wine-light',
    border: 'border-l-wine',
  },
  ANTHOLOGIE: {
    label: 'Anthologie',
    bg: 'bg-sage/10 dark:bg-sage/20',
    text: 'text-sage dark:text-sage-light',
    border: 'border-l-sage',
  },
  ZEITSCHRIFT: {
    label: 'Zeitschrift',
    bg: 'bg-gold/10 dark:bg-gold/20',
    text: 'text-yellow-700 dark:text-gold-light',
    border: 'border-l-gold',
  },
}

function DeadlineChip({ deadline, type }: { deadline: Date | null | undefined; type: string }) {
  if (type === 'ZEITSCHRIFT' && !deadline) {
    return (
      <span className="font-mono text-xs text-yellow-600 dark:text-gold bg-gold/10 dark:bg-gold/20 px-2 py-0.5 rounded">
        laufend
      </span>
    )
  }
  if (!deadline) return null

  const now = new Date()
  const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = format(deadline, 'dd.MM.yy', { locale: de })

  if (days < 0) {
    return (
      <span className="font-mono text-xs text-red-500 dark:text-red-400 line-through opacity-60">
        {dateStr}
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded animate-pulse">
        {dateStr} · {days}d
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
        {dateStr} · {days}d
      </span>
    )
  }
  return (
    <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
      {dateStr}
    </span>
  )
}

export function CompetitionCard({
  id,
  type,
  name,
  organizer,
  deadline,
  theme,
  genres,
  prize,
  maxLength,
  url,
  planned = false,
  relevanceScore,
  onDismiss,
  onPlan,
}: CompetitionCardProps) {
  const [isPlanned, setIsPlanned] = useState(planned)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const config = typeConfig[type]

  const handlePlan = async () => {
    if (loadingPlan) return
    setLoadingPlan(true)
    try {
      if (isPlanned) {
        await fetch(`/api/competitions/${id}/plan`, { method: 'DELETE' })
        setIsPlanned(false)
        onPlan?.(id, false)
      } else {
        await fetch(`/api/competitions/${id}/plan`, { method: 'POST' })
        setIsPlanned(true)
        onPlan?.(id, true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.(id)
    fetch(`/api/competitions/${id}/dismiss`, { method: 'POST' }).catch(console.error)
  }

  if (dismissed) return null

  return (
    <article
      className={`group relative rounded-xl bg-white dark:bg-dark-surface border-l-[3px] ${config.border} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* Dismiss button — appears on hover */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 z-10"
        aria-label="Ausblenden"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="p-5">
        {/* Type badge + optional AI match score */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}>
            {config.label}
          </span>
          {relevanceScore && relevanceScore > 0.5 && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-accent-light/10 dark:bg-accent/10 text-accent-light dark:text-accent-light">
              ✦ {(relevanceScore * 100).toFixed(0)}% Match
            </span>
          )}
          <DeadlineChip deadline={deadline} type={type} />
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug mb-1 pr-6">
          {name}
        </h3>

        {/* Organizer */}
        {organizer && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
            {organizer}
          </p>
        )}

        {/* Theme */}
        {theme && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3 leading-relaxed">
            „{theme}"
          </p>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {genres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Prize + maxLength */}
        {(prize || maxLength) && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
            {prize && <span>🏆 {prize}</span>}
            {maxLength && <span>📝 max. {maxLength}</span>}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/80 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 rounded-b-xl">
        <button
          onClick={handlePlan}
          disabled={loadingPlan}
          className={`flex items-center gap-1.5 text-xs font-medium transition-all rounded-lg px-3 py-1.5 ${
            isPlanned
              ? 'bg-accent-light text-white dark:bg-accent dark:text-dark-bg'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" fill={isPlanned ? 'currentColor' : 'none'} />
          {isPlanned ? 'Vorgemerkt' : 'Merken'}
        </button>

        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs font-medium text-accent-light dark:text-accent-light hover:underline"
        >
          Zur Ausschreibung
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </article>
  )
}
