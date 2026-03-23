'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Filter, BookOpen, Plus, X, Globe, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CompetitionCard } from '@/components/competition/CompetitionCard'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// ─── Quellensuche Dialog ────────────────────────────────────────────────────

function QuellensucheDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setState('loading')
    try {
      const srcRes = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || url.trim(), url: url.trim() }),
      })
      if (!srcRes.ok) throw new Error('Quelle konnte nicht hinzugefügt werden')
      const { source } = await srcRes.json()
      await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id }),
      })
      setState('done')
      setMessage('Quelle hinzugefügt! Der Crawl läuft im Hintergrund — neue Ausschreibungen erscheinen bald.')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quellensuche anfragen</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {state === 'done' ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage-muted">
              <RotateCw className="h-6 w-6 text-sage" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            <button onClick={onClose} className="mt-5 text-sm font-medium text-accent hover:underline">Schließen</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Füge eine Website hinzu, die nach Ausschreibungen durchsucht werden soll.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://literaturcafe.de/ausschreibungen"
                required
                className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. LiteraturCafe"
                className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {state === 'error' && <p className="text-xs text-red-500">{message}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 dark:border-dark-border px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-muted transition-colors">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!url.trim() || state === 'loading'}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {state === 'loading' ? <RotateCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {state === 'loading' ? 'Wird gestartet…' : 'Suche starten'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

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
  const [showQuellensuche, setShowQuellensuche] = useState(false)
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
    <main className="min-h-screen bg-lit-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="h-7 w-7 text-accent" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Entdecken
              </h1>
            </div>
            <p className="mt-1 text-gray-500 dark:text-gray-400 ml-10">
              {total > 0
                ? `${total} Ausschreibungen gefunden`
                : 'Alle verfügbaren Schreibwettbewerbe und Publikationsmöglichkeiten'}
            </p>
          </div>
          <button
            onClick={() => setShowQuellensuche(true)}
            className="shrink-0 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            <Globe className="h-4 w-4" />
            Quelle anfragen
          </button>
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
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-black placeholder-gray-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-accent-light dark:border-gray-700 dark:bg-dark-surface dark:text-white dark:placeholder-gray-500 dark:focus:ring-accent"
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
                    ? 'bg-accent-light text-white shadow-sm dark:bg-accent dark:text-dark-bg'
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
                  ? 'bg-accent-light text-white dark:bg-accent dark:text-dark-bg'
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
                    <div key={i} className="h-48 rounded-xl bg-lit-surface dark:bg-dark-surface animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-xl bg-lit-surface p-12 text-center dark:bg-dark-surface border border-gray-200 dark:border-gray-700">
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

      {showQuellensuche && (
        <QuellensucheDialog onClose={() => setShowQuellensuche(false)} />
      )}
    </main>
  )
}
