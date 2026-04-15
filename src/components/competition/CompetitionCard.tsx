'use client'

import React from 'react'
import Link from 'next/link'
import { Star, X, ExternalLink, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

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
  relevanceScore?: number | null
  onStar?: (id: string, starred: boolean) => void
  onDismiss?: (id: string) => void
}

const typeConfig = {
  WETTBEWERB: { color: 'wine', label: 'Wettbewerb' },
  ANTHOLOGIE: { color: 'sage', label: 'Anthologie' },
  ZEITSCHRIFT: { color: 'gold', label: 'Zeitschrift' },
}

function getDaysRemaining(deadline: Date): { days: number; isExpired: boolean } {
  const deadlineEnd = new Date(deadline)
  deadlineEnd.setHours(23, 59, 59, 999)
  const diffTime = deadlineEnd.getTime() - Date.now()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return { days: diffDays, isExpired: diffDays <= 0 }
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
  relevanceScore,
  onStar,
  onDismiss,
}: CompetitionCardProps) {
  const config = typeConfig[type]
  const deadlineInfo = deadline ? getDaysRemaining(deadline) : null

  return (
    <Card
      borderLeftColor={config.color as 'wine' | 'sage' | 'gold'}
      padding="md"
      className="hover:shadow-md transition-shadow"
    >
      <div className="space-y-4">
        {/* Header with Title and Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={config.color as 'wine' | 'sage' | 'gold'}>
                {config.label}
              </Badge>
              {relevanceScore && relevanceScore > 0 && (
                <Badge variant="accent">
                  Match: {(relevanceScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
              {name}
            </h3>
            {organizer && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {organizer}
              </p>
            )}
          </div>
        </div>

        {/* Theme */}
        {theme && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">
              Thema
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              {theme}
            </p>
          </div>
        )}

        {/* Deadline */}
        {deadline && deadlineInfo && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm">
              {deadlineInfo.isExpired ? (
                <span className="text-red-500 font-medium">Abgelaufen</span>
              ) : deadlineInfo.days <= 7 ? (
                <span className="text-orange-500 font-medium">
                  {deadlineInfo.days} Tag{deadlineInfo.days !== 1 ? 'e' : ''} verbleibend
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  {deadlineInfo.days} Tag{deadlineInfo.days !== 1 ? 'e' : ''} verbleibend
                </span>
              )}
            </span>
          </div>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Badge key={genre} variant="default">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        {/* Prize and Max Length */}
        {(prize || maxLength) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {prize && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Preisgeld
                </p>
                <p className="font-medium text-black dark:text-white">{prize}</p>
              </div>
            )}
            {maxLength && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Max. Länge
                </p>
                <p className="font-medium text-black dark:text-white">{maxLength}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStar?.(id, !starred)}
              aria-label={starred ? 'Remove from starred' : 'Add to starred'}
              className={starred ? 'text-yellow-500' : ''}
            >
              <Star className="h-4 w-4" fill={starred ? 'currentColor' : 'none'} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss?.(id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Link href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm" className="gap-2">
              Zur Ausschreibung
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
