'use client'

import React, { useState, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SearchFiltersState {
  search: string
  type?: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT' | 'all'
  genres: string[]
  deadlineRange?: 'all' | '7days' | '30days' | '90days'
  starredOnly?: boolean
  sortBy?: 'newest' | 'deadline' | 'relevance'
}

export interface SearchFiltersProps {
  onFilterChange?: (filters: SearchFiltersState) => void
  availableGenres?: string[]
}

const COMMON_GENRES = [
  'Kurzgeschichte',
  'Roman',
  'Lyrik',
  'Drama',
  'Essay',
  'Sachbuch',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
]

export function SearchFilters({
  onFilterChange,
  availableGenres = COMMON_GENRES,
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFiltersState>({
    search: '',
    type: 'all',
    genres: [],
    deadlineRange: 'all',
    starredOnly: false,
    sortBy: 'deadline',
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = useCallback((value: string) => {
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [filters, onFilterChange])

  const handleTypeChange = useCallback(
    (type: SearchFiltersState['type']) => {
      const newFilters = { ...filters, type }
      setFilters(newFilters)
      onFilterChange?.(newFilters)
    },
    [filters, onFilterChange]
  )

  const handleGenreToggle = useCallback(
    (genre: string) => {
      const newGenres = filters.genres.includes(genre)
        ? filters.genres.filter((g) => g !== genre)
        : [...filters.genres, genre]
      const newFilters = { ...filters, genres: newGenres }
      setFilters(newFilters)
      onFilterChange?.(newFilters)
    },
    [filters, onFilterChange]
  )

  const handleDeadlineChange = useCallback(
    (range: SearchFiltersState['deadlineRange']) => {
      const newFilters = { ...filters, deadlineRange: range }
      setFilters(newFilters)
      onFilterChange?.(newFilters)
    },
    [filters, onFilterChange]
  )

  const handleStarredOnlyToggle = useCallback(() => {
    const newFilters = { ...filters, starredOnly: !filters.starredOnly }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [filters, onFilterChange])

  const handleSortChange = useCallback(
    (sortBy: SearchFiltersState['sortBy']) => {
      const newFilters = { ...filters, sortBy }
      setFilters(newFilters)
      onFilterChange?.(newFilters)
    },
    [filters, onFilterChange]
  )

  const resetFilters = useCallback(() => {
    const newFilters: SearchFiltersState = {
      search: '',
      type: 'all',
      genres: [],
      deadlineRange: 'all',
      starredOnly: false,
      sortBy: 'deadline',
    }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [onFilterChange])

  return (
    <div className="space-y-4 bg-light-surface dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Thema..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-accent-light dark:focus:border-accent-dark"
          />
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Typ
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', 'WETTBEWERB', 'ANTHOLOGIE', 'ZEITSCHRIFT'].map((type) => (
                <Button
                  key={type}
                  variant={filters.type === type ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    handleTypeChange(
                      type as SearchFiltersState['type']
                    )
                  }
                >
                  {type === 'all' ? 'Alle' : type === 'WETTBEWERB' ? 'Wettbewerbe' : type === 'ANTHOLOGIE' ? 'Anthologien' : 'Zeitschriften'}
                </Button>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <Button
                  key={genre}
                  variant={filters.genres.includes(genre) ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleGenreToggle(genre)}
                >
                  {genre}
                </Button>
              ))}
            </div>
          </div>

          {/* Deadline Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Fristbereich
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', '7days', '30days', '90days'].map((range) => (
                <Button
                  key={range}
                  variant={filters.deadlineRange === range ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    handleDeadlineChange(
                      range as SearchFiltersState['deadlineRange']
                    )
                  }
                >
                  {range === 'all'
                    ? 'Alle'
                    : range === '7days'
                      ? '7 Tage'
                      : range === '30days'
                        ? '30 Tage'
                        : '90 Tage'}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Sortierung
            </label>
            <div className="flex flex-wrap gap-2">
              {['deadline', 'newest', 'relevance'].map((sort) => (
                <Button
                  key={sort}
                  variant={filters.sortBy === sort ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    handleSortChange(
                      sort as SearchFiltersState['sortBy']
                    )
                  }
                >
                  {sort === 'deadline'
                    ? 'Frist'
                    : sort === 'newest'
                      ? 'Neu'
                      : 'Relevanz'}
                </Button>
              ))}
            </div>
          </div>

          {/* Starred Only Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="starred-only"
              checked={filters.starredOnly}
              onChange={handleStarredOnlyToggle}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label
              htmlFor="starred-only"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Nur markierte anzeigen
            </label>
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="w-full"
          >
            Filter zurücksetzen
          </Button>
        </div>
      )}
    </div>
  )
}
