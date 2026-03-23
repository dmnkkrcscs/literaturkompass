'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Bookmark, X, ExternalLink, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
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
  WETTBEWERB: { color: 'wine', label: 'Wettbewerb' },
  ANTHOLOGIE: { color: 'sage', label: 'Anthologie' },
  ZEITSCHRIFT: { color: 'gold', label: 'Zeitschrift' },
}

function DeadlineDisplay({ deadline, type }: { deadline: Date | null | undefined; type: string }) {
  if (type === 'ZEITSCHRIFT' && !deadline) {
    return (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gold" />
        <span className="text-sm text-gold font-medium">Laufende Einreichungen</span>
      </div>
    )
  }
  if (!deadline) return null

  const now = new Date()
  const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = format(deadline, 'dd. MMM yyyy', { locale: de })

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      {days < 0 ? (
        <span className="text-sm text-red-500 font-medium">Abgelaufen · {dateStr}</span>
      ) : days <= 7 ? (
        <span className="text-sm text-orange-500 font-medium">{days}d · {dateStr}</span>
      ) : days <= 30 ? (
        <span className="text-sm text-yellow-500 font-medium">{days}d · {dateStr}</span>
      ) : (
        <span className="text-sm text-gray-600 dark:text-gray-400">{dateStr}</span>
      )}
    </div>
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
  starred = false,
  planned = false,
  relevanceScore,
  onStar,
  onDismiss,
  onPlan,
}: CompetitionCardProps) {
  const [isPlanned, setIsPlanned] = useState(planned)
  const [loadingPlan, setLoadingPlan] = useState(false)
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
    } catch (error) {
      console.error('Failed to plan competition:', error)
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleDismiss = () => {
    onDismiss?.(id)
    fetch(`/api/competitions/${id}/dismiss`, { method: 'POST' }).catch(console.error)
  }

  return (
    <Card
      borderLeftColor={config.color as 'wine' | 'sage' | 'gold'}
      padding="md"
      className="hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.color as 'wine' | 'sage' | 'gold'}>
                {config.label}
              </Badge>
              {relevanceScore && relevanceScore > 0 && (
                <Badge variant="accent">
                  {(relevanceScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold text-black dark:text-white leading-tight">
              {name}
            </h3>
            {organizer && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {organizer}
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors mt-0.5"
            aria-label="Ausblenden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Theme */}
        {theme && (
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            „{theme}"
          </p>
        )}

        {/* Deadline */}
        <DeadlineDisplay deadline={deadline} type={type} />

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((genre) => (
              <span
                key={genre}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Prize / MaxLength */}
        {(prize || maxLength) && (
          <div className="flex gap-4 text-sm">
            {prize && (
              <span className="text-gray-600 dark:text-gray-400">
                🏆 <span className="font-medium text-black dark:text-white">{prize}</span>
              </span>
            )}
            {maxLength && (
              <span className="text-gray-600 dark:text-gray-400">
                📝 <span className="font-medium text-black dark:text-white">{maxLength}</span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handlePlan}
            disabled={loadingPlan}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
              isPlanned
                ? 'bg-accent-light/10 text-accent-light dark:bg-accent-dark/10 dark:text-accent-dark'
                : 'text-gray-500 hover:text-accent-light dark:text-gray-400 dark:hover:text-accent-dark hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label={isPlanned ? 'Aus Plan entfernen' : 'Vormerken'}
          >
            <Bookmark
              className="h-4 w-4"
              fill={isPlanned ? 'currentColor' : 'none'}
            />
            {isPlanned ? 'Vorgemerkt' : 'Merken'}
          </button>

          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-sm font-medium text-accent-light dark:text-accent-dark hover:underline"
          >
            Zur Ausschreibung
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  )
}
