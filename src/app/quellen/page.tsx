'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, RotateCw, Activity } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui/Toast'

interface Source {
  id: string
  name: string
  url: string
  type: string
  lastCrawl: Date | null
  successRate: number
  totalCrawls: number
  isActive: boolean
}

export default function QuellenPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', url: '' })
  const [crawlingId, setCrawlingId] = useState<string | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      setSources(data.sources || [])
    } catch (error) {
      console.error('Failed to load sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSource.name || !newSource.url) return

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      })

      if (response.ok) {
        setNewSource({ name: '', url: '' })
        setShowAddForm(false)
        await loadSources()
      }
    } catch (error) {
      console.error('Failed to add source:', error)
    }
  }

  const handleStartCrawl = async (sourceId: string) => {
    setCrawlingId(sourceId)
    try {
      const response = await fetch(`/api/crawl/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      })

      if (response.ok) {
        await loadSources()
      }
    } catch (error) {
      console.error('Failed to start crawl:', error)
    } finally {
      setCrawlingId(null)
    }
  }

  const handleToggleActive = async (sourceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        await loadSources()
      }
    } catch (error) {
      console.error('Failed to update source:', error)
    }
  }

  const { toast } = useToast()

  const typeLabels: Record<string, string> = {
    AGGREGATOR: 'Aggregator',
    SEARCH: 'Suchmaschine',
    MANUAL: 'Manuell',
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Quellen
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Verwaltung von Crawling-Quellen
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/crawl-log">
              <Button variant="secondary">
                <Activity className="mr-2 h-4 w-4" />
                Crawl Log
              </Button>
            </Link>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Quelle hinzufügen
            </Button>
          </div>
        </div>

        {/* Add Source Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSource}
            className="mb-8 rounded-lg bg-light-surface p-6 dark:bg-dark-surface"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">
                  Name
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) =>
                    setNewSource({ ...newSource, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                  placeholder="z.B. LiteraturCafe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">
                  URL
                </label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) =>
                    setNewSource({ ...newSource, url: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="primary">
                  Speichern
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Sources List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">
              Laden...
            </div>
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <p className="text-gray-600 dark:text-gray-400">
              Noch keine Quellen hinzugefügt
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-lg border border-gray-200 bg-light-surface p-4 dark:border-gray-700 dark:bg-dark-surface"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-black dark:text-white">
                      {source.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {source.url}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="default">
                        {typeLabels[source.type] || source.type}
                      </Badge>
                      <Badge variant={source.isActive ? 'sage' : 'wine'}>
                        {source.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Erfolgsrate
                        </p>
                        <p className="font-semibold text-black dark:text-white">
                          {(source.successRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Crawls
                        </p>
                        <p className="font-semibold text-black dark:text-white">
                          {source.totalCrawls}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Zuletzt
                        </p>
                        <p className="font-semibold text-black dark:text-white">
                          {source.lastCrawl
                            ? new Date(source.lastCrawl).toLocaleDateString(
                                'de-DE'
                              )
                            : 'Nie'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      onClick={() => handleStartCrawl(source.id)}
                      loading={crawlingId === source.id}
                      variant="primary"
                      size="sm"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() =>
                        handleToggleActive(source.id, source.isActive)
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        source.isActive
                          ? 'bg-sage/20 text-sage dark:text-sage'
                          : 'bg-wine/20 text-wine dark:text-wine'
                      }`}
                    >
                      {source.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
