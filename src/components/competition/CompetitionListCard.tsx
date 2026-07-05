'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { TYPE_LABELS, daysUntil, formatDateShort } from '@/lib/utils'

export interface CompetitionListCardProps {
  id: string
  name: string
  organizer?: string | null
  theme?: string | null
  type: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
  deadline?: Date | string | null
  genres?: string[]
  prize?: string | null
  magazineName?: string | null
  alreadySubmitted?: boolean
  /** Show the deadline inline in the badge row, colored red under 7 days
   * (geplant's style). When false, a plain date is shown top-right instead
   * (entdecken's browse style) unless `action` overrides that slot. */
  inlineDeadline?: boolean
  /** Top-right content next to the title, e.g. an "Einreichen" button.
   * Defaults to a plain formatted deadline when omitted. */
  action?: React.ReactNode
}

/**
 * Shared competition list-item card used by geplant/ and entdecken/ — the
 * two lists that browse raw Competition rows (offen/absagen/hall-of-fame
 * render Submissions, a different shape, and keep their own markup).
 */
export function CompetitionListCard({
  id,
  name,
  organizer,
  theme,
  type,
  deadline,
  genres = [],
  prize,
  magazineName,
  alreadySubmitted,
  inlineDeadline,
  action,
}: CompetitionListCardProps) {
  const deadlineDate = deadline ? new Date(deadline) : null
  const daysLeft = deadlineDate ? daysUntil(deadlineDate) : null

  return (
    <div className="rounded-lg border border-gray-200 bg-light-surface p-5 transition-all hover:shadow-md dark:border-gray-700 dark:bg-dark-surface">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <Link href={`/wettbewerb/${id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-black dark:text-white">
            {name}
          </h3>
          {organizer && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {organizer}
            </p>
          )}
          {theme && (
            <p className="mt-1 text-sm italic text-gray-500 dark:text-gray-400">
              {theme}
            </p>
          )}
          {prize && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Preis: {prize}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{TYPE_LABELS[type] || type}</Badge>
            {alreadySubmitted && <Badge variant="submitted">Bereits eingereicht</Badge>}
            {magazineName && <Badge variant="gold">{magazineName}</Badge>}
            {genres.length > 0 && (
              <Badge variant="sage">
                {genres.slice(0, 2).join(', ')}
                {genres.length > 2 && ` +${genres.length - 2}`}
              </Badge>
            )}
            {inlineDeadline && deadlineDate && daysLeft !== null && (
              <span
                className={`text-sm font-medium ${
                  daysLeft <= 7
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {formatDateShort(deadlineDate)}
                {daysLeft > 0 && <span className="ml-1">({daysLeft} Tage)</span>}
              </span>
            )}
          </div>
        </Link>

        <div className="shrink-0">
          {action ??
            (!inlineDeadline && deadlineDate && (
              <span className="text-sm font-medium text-accent-light dark:text-accent-dark">
                {formatDateShort(deadlineDate)}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
