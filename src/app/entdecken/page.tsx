'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Competition {
  id: string
  name: string
  organizer?: string | null
  deadline: Date | null
  type: string
  theme?: string | null
  prize?: string | null
  genres: string[]
}

interface FilterState {
  search: string
  type: 'ALL' | 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
  hasDeadline: boolean
}

export default function EntdeckenPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'ALL',
    hasDeadline: false,
  })

  const typeLabels: Record<string, string> = {
    ALL: 'Alle',
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  const loadCompetitions = useCallback(
    async (skipCount: number = 0) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('skip', skipCount.toString())
        params.append('take', '10')

        if (filters.search) {
          params.append('search', filters.search)
        }
        if (filters.type !== 'ALL') {
          params.append('type', filters.type)
        }
        if (filters.hasDeadline) {
          params.append('hasDeadline', 'true')
        }

        const response = await fetch(`/api/competitions?${params.toString()}`)
        const data = await response.json()

        if (skipCount === 0) {
          setCompetitions(data.competitions || [])
        } else {
          setCompetitions((prev) => [...prev, ...(data.competitions || [])])
        }

        setHasMore(data.hasMore || false)
      } catch (error) {
        console.error('Failed to load competitions:', error)
      } finally {
        setLoading(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    setSkip(0)
    loadCompetitions(0)
  }, [filters])

  const handleLoadMore = () => {
    const newSkip = skip + 10
    setSkip(newSkip)
    loadCompetitions(newSkip)
  }

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }))
    }, 300)
  }

  const handleTypeChange = (type: FilterState['type']) => {
    setFilters((prev) => ({ ...prev, type }))
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Entdecken
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Durchsuchen Sie alle verfügbaren Schreibwettbewerbe und Publikationsmöglichkeiten
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nach Wettbewerben suchen..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-black placeholder-gray-500 dark:border-gray-600 dark:bg-dark-surface dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <Filter className="h-5 w-5 self-center text-gray-600 dark:text-gray-400" />
            {(Object.keys(typeLabels) as Array<FilterState['type']>).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                    filters.type === type
                      ? 'bg-accent-light text-white dark:bg-accent-dark'
                      : 'bg-light-surface text-black dark:bg-dark-surface dark:text-white'
                  }`}
                >
                  {typeLabels[type]}
                </button>
              )
            )}
          </div>
        </div>

        {/* Results */}
        {loading && competitions.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">
              Laden...
            </div>
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-lg bg-light-surface p-8 text-center dark:bg-dark-surface">
            <p className="text-gray-600 dark:text-gray-400">
              Keine Wettbewerbe gefunden
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {competitions.map((comp) => (
                <Link
                  key={comp.id}
                  href={`/wettbewerb/${comp.id}`}
                  className="block rounded-lg border border-gray-200 bg-light-surface p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-dark-surface"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {comp.name}
                      </h3>
                      {comp.organizer && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {comp.organizer}
                        </p>
                      )}
                      {comp.theme && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Thema: {comp.theme}
                        </p>
                      )}
                      {comp.prize && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Preis: {comp.prize}
                        </p>
                      )}
                    </div>

                    <div className="ml-4 text-right">
                      {comp.deadline && (
                        <p className="text-sm font-medium text-accent-light dark:text-accent-dark">
                          {format(new Date(comp.deadline), 'dd. MMM yyyy', {
                            locale: de,
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="default">
                      {comp.type === 'WETTBEWERB'
                        ? 'Wettbewerb'
                        : comp.type === 'ANTHOLOGIE'
                          ? 'Anthologie'
                          : 'Zeitschrift'}
                    </Badge>
                    {comp.genres && comp.genres.length > 0 && (
                      <Badge variant="sage">
                        {comp.genres.slice(0, 2).join(', ')}
                        {comp.genres.length > 2 &&
                          ` +${comp.genres.length - 2}`}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  loading={loading}
                  variant="secondary"
                >
                  Mehr laden
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
