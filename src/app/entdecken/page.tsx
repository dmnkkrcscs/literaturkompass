'use client'

import { useRef, useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/Button'
import { CompetitionListCard } from '@/components/competition/CompetitionListCard'

interface FilterState {
  search: string
  type: 'ALL' | 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
}

const PAGE_SIZE = 10

export default function EntdeckenPage() {
  const [take, setTake] = useState(PAGE_SIZE)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'ALL',
  })

  const typeLabels: Record<string, string> = {
    ALL: 'Alle',
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  const { data, isLoading } = trpc.competition.list.useQuery({
    filters: {
      search: filters.search || undefined,
      type: filters.type !== 'ALL' ? filters.type : undefined,
    },
    pagination: { take },
    sort: 'deadline',
  })

  const competitions = data?.competitions || []
  const hasMore = data?.pagination.hasMore ?? false

  const handleLoadMore = () => setTake((prev) => prev + PAGE_SIZE)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setTake(PAGE_SIZE)
      setFilters((prev) => ({ ...prev, search: value }))
    }, 300)
  }

  const handleTypeChange = (type: FilterState['type']) => {
    setTake(PAGE_SIZE)
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
        {isLoading && competitions.length === 0 ? (
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
                <CompetitionListCard
                  key={comp.id}
                  id={comp.id}
                  name={comp.name}
                  organizer={comp.organizer}
                  theme={comp.theme}
                  prize={comp.prize}
                  type={comp.type as 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'}
                  deadline={comp.deadline}
                  genres={comp.genres}
                  alreadySubmitted={!!comp.submissions && comp.submissions.length > 0}
                  magazineName={comp.magazine?.name}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  loading={isLoading}
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
