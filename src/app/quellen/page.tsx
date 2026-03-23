'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, RotateCw, Database, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

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

// ─── DACH Import Banner ───────────────────────────────────────────────────────

function DachImportBanner({ onImported }: { onImported: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ competitions?: number; sources?: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleImport = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/admin/seed-dach?token=LitKompass2026!update', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setState('done')
        setResult(data.imported)
        onImported()
      } else {
        setState('error')
        setErrorMsg(data.message || 'Unbekannter Fehler')
      }
    } catch (e) {
      setState('error')
      setErrorMsg(String(e))
    }
  }

  if (state === 'done') {
    return (
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-sage-muted dark:bg-sage/10 border border-sage/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-sage shrink-0" />
          <div>
            <p className="text-sm font-semibold text-sage">Import erfolgreich!</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {result?.competitions} Ausschreibungen und {result?.sources} Quellen aus der DACH-Recherche importiert.
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">
          Ausblenden
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 dark:bg-accent/10 overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        <Database className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            DACH-Grundrecherche 2026/27 importieren
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            36 Ausschreibungen (Wettbewerbe, Anthologien, Zeitschriften) + 18 Crawl-Quellen aus der manuellen Recherche direkt in die Datenbank laden.
          </p>
          {state === 'error' && (
            <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Verbergen
          </button>
          <button
            onClick={handleImport}
            disabled={state === 'loading'}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            {state === 'loading'
              ? <><RotateCw className="h-4 w-4 animate-spin" /> Importiere…</>
              : <><Database className="h-4 w-4" /> Jetzt importieren</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function QuellenPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', url: '' })
  const [crawlingId, setCrawlingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      const response = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      })
      if (response.ok) await loadSources()
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
      if (response.ok) await loadSources()
    } catch (error) {
      console.error('Failed to update source:', error)
    }
  }

  const typeColors: Record<string, string> = {
    AGGREGATOR: 'bg-accent/10 text-accent',
    SEARCH: 'bg-gold-muted text-gold',
    MANUAL: 'bg-sage-muted text-sage',
  }
  const typeLabels: Record<string, string> = {
    AGGREGATOR: 'Aggregator',
    SEARCH: 'Suchmaschine',
    MANUAL: 'Manuell',
  }

  return (
    <main className="min-h-screen bg-lit-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Verwaltung</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Quellen</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {sources.length} Quellen · Crawl-Grundlage für neue Ausschreibungen
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Quelle hinzufügen
          </button>
        </div>

        {/* DACH Import Banner */}
        <DachImportBanner onImported={loadSources} />

        {/* Add Source Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSource}
            className="mb-6 rounded-2xl bg-white dark:bg-dark-surface shadow-sm p-5 space-y-4 border border-gray-100 dark:border-dark-border"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Neue Quelle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="z.B. LiteraturCafe"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">URL</label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-muted px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-all">
                Speichern
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-xl border border-gray-200 dark:border-dark-border px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-muted transition-colors">
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Sources List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white dark:bg-dark-surface animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border p-12 text-center">
            <Database className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">Noch keine Quellen</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Starte mit dem DACH-Import oben</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Status dot */}
                  <span className={`shrink-0 h-2 w-2 rounded-full ${source.isActive ? 'bg-sage' : 'bg-gray-300'}`} />

                  {/* Name + URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{source.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{source.url}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`hidden sm:inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${typeColors[source.type] || 'bg-gray-100 text-gray-500'}`}>
                    {typeLabels[source.type] || source.type}
                  </span>

                  {/* Last crawl */}
                  <span className="hidden md:block shrink-0 font-mono text-xs text-gray-400">
                    {source.lastCrawl ? new Date(source.lastCrawl).toLocaleDateString('de-DE') : '—'}
                  </span>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => handleStartCrawl(source.id)}
                      disabled={crawlingId === source.id}
                      title="Crawl starten"
                      className="p-2 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
                    >
                      <RotateCw className={`h-4 w-4 ${crawlingId === source.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {expandedId === source.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === source.id && (
                  <div className="border-t border-gray-100 dark:border-dark-border px-5 py-3 flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                    <span>Erfolgsrate: <strong className="text-gray-900 dark:text-white">{(source.successRate * 100).toFixed(0)}%</strong></span>
                    <span>Crawls gesamt: <strong className="text-gray-900 dark:text-white">{source.totalCrawls}</strong></span>
                    <button
                      onClick={() => handleToggleActive(source.id, source.isActive)}
                      className={`ml-auto rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        source.isActive
                          ? 'bg-wine-muted text-wine hover:bg-wine/20'
                          : 'bg-sage-muted text-sage hover:bg-sage/20'
                      }`}
                    >
                      {source.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
