import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export const MS_PER_DAY = 86_400_000

/** Days remaining until a deadline (positive = future, negative = past) */
export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY)
}

/** Days elapsed since a date */
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY)
}

/** Format date as "6. Apr. 2026" (German locale, date-fns) */
export function formatDateShort(date: Date): string {
  return format(date, 'dd. MMM yyyy', { locale: de })
}

/** Format date as "6. April" (German locale, no year) */
export function formatDateDE(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(date)
}

/** Competition type labels (German) */
export const TYPE_LABELS: Record<string, string> = {
  WETTBEWERB: 'Wettbewerb',
  ANTHOLOGIE: 'Anthologie',
  ZEITSCHRIFT: 'Zeitschrift',
} as const

/** Simple in-memory cache with TTL */
export function createMemoryCache<T>(ttlMs: number) {
  let entry: { data: T; timestamp: number } | null = null
  return {
    get(): T | null {
      if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data
      return null
    },
    set(data: T) {
      entry = { data, timestamp: Date.now() }
    },
  }
}
