'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Filter, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CompetitionCard } from '@/components/competition/CompetitionCard'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Competition {
  id: string
  name: string
  organizer?: string | null
  deadline: string | null
  type: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
  theme?: string | null
  prize?: string | null
  maxLength?: string | null
  url: string
  genres: string[]
}

interface FilterState {
  search: string
  type: 'ALL' | 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
  hasDeadline: boolean
}

const typeLabels: Record<string, string> = {
  ALL: 'Alle',
  WETTBEWERB: 'Wettbewerb',
  ANTHOLOGIE: 'Anthologie',
  ZEITSCHRIFT: 'Zeitschrift',
}

function groupByMonth(competitions: Competition[]): Array<{ label: string; items: Competition[] }> {
  const monthMap = new Map<string, Competition[]>()
  const rolling: Competition[] = []

  for (const comp of competitions) {
    if (!comp.deadline || comp.type === 'ZEITSCHRIFT') {
      rolling.push(comp)
    } else {
      const d = new Date(comp.deadline)
      const key = format(d, 'yyyy-MM')
      if (!monthMap.has(key)) monthMap.set(key, [])
      monthMap.get(key)!.push(comp)
    }
  }

  const groups: Array<{ label: string; items: Competition[] }> = []
  for (const [key, items] of monthMap) {
    const [year, month] = key.split('-')
    const d = new Date(parseInt(year), parseInt(month) - 1, 1)
    groups.push({ label: format(d, 'MMMM yyyy', { locale: de }), items })
  }

  if (rolling.length > 0) {
    groups.push({ label: 'Laufende Einreichungen', items: rolling })
  }

  return groups
}

export default function EntdeckenPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'ALL',
    hasDeadline: false,
  })

  const loadCompetitions = useCallback(
    async (skipCount: number = 0) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('skip', skipCount.toString())
        params.append('take', '24')
        if (filters.search) params.append('search', filters.search)
        if (filters.type !== 'ALL') params.append('type', filters.type)
        if (filters.hasDeadline) params.append('hasDeadline', 'true')

        const response = await fetch(`/api/competitions?${params.toString()}`)
        const data = await response.json()

        if (skipCount === 0) {
          setCompetitions(data.competitions || [])
        } else {
          setCompetitions((prev) => [...prev, ...(data.competitions || [])])
        }

        setHasMore(data.hasMore || false)
        setTotal(data.total || 0)
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
    const newSkip = skip + 24
    setSkip(newSkip)
    loadCompetitions(newSkip)
  }

  const handleDismiss = (id: string) => {
    setCompetitions((prev) => prev.filter((c) => c.id !== id))
  }

  const grouped = groupByMonth(competitions)

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="h-8 w-8 text-accent-light dark:text-accent-dark" />
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
              Entdecken
            </h1>
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400 ml-11">
            {total > 0
              ? `${total} Ausschreibungen gefunden`
              : 'Alle verfügbaren Schreibwettbewerbe und Publikationsmöglichkeiten'}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nach Wettbewerben, Themen oder Veranstaltern suchen…"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-black placeholder-gray-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-accent-light dark:border-gray-700 dark:bg-dark-surface dark:text-white dark:placeholder-gray-500 dark:focus:ring-accent-dark"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
            {(Object.keys(typeLabels) as Array<FilterState['type']>).map((type) => (
              <button
                key={type}
                onClick={() => setFilters((prev) => ({ ...prev, type }))}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  filters.type === type
                    ? 'bg-accent-light text-white shadow-sm dark:bg-accent-dark dark:text-dark-bg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-dark-surface dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
            <button
              onClick={() => setFilters((prev) => ({ ...prev, hasDeadline: !prev.hasDeadline }))}
              className={`ml-auto rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                filters.hasDeadline
                  ? 'bg-accent-light text-white dark:bg-accent-dark dark:text-dark-bg'
                  : 'bg-white text-gray-700 dark:bg-dark-surface dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Nur mit Deadline
            </button>
          </div>
        </div>

        {/* Results */}
        {loading && competitions.length === 0 ? (
          <div className="space-y-8">
            {[...Array(2)].map((_, gi) => (
              <div key={gi}>
                <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-48 rounded-xl bg-light-surface dark:bg-dark-surface animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-xl bg-light-surface p-12 text-center dark:bg-dark-surface border border-gray-200 dark:border-gray-700">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
              Keine Ausschreibungen gefunden
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Versuche andere Suchbegriffe oder Filter
            </p>
          </div>
        ) : (
          <>
            {/* Month-grouped sections */}
            <div className="space-y-10">
              {grouped.map((group) => (
                <section key={group.label}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {group.label}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {group.items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {group.items.map((comp) => (
                      <CompetitionCard
                        key={comp.id}
                        id={comp.id}
                        type={comp.type}
                        name={comp.name}
                        organizer={comp.organizer}
                        deadline={comp.deadline ? new Date(comp.deadline) : null}
                        theme={comp.theme}
                        genres={comp.genres}
                        prize={comp.prize}
                        maxLength={comp.maxLength}
                        url={comp.url}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  loading={loading}
                  variant="secondary"
                  className="px-8"
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
