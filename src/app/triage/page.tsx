'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Star, X, CheckCircle, Inbox, Sparkles, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { daysUntil, formatDateShort, TYPE_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

// ─── Preset dismiss reasons ─────────────────────────────────────────────────
const DISMISS_PRESETS = [
  { key: '1', label: 'Falsches Genre' },
  { key: '2', label: 'Zu teuer / Gebühr' },
  { key: '3', label: 'Zu kurze Deadline' },
  { key: '4', label: 'Nicht mein Thema' },
  { key: '5', label: 'Altersbeschränkung' },
  { key: '6', label: 'Regionalbeschränkung' },
  { key: '7', label: 'Schlechte Qualität / Unseriös' },
]

// ─── Score-Badge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : score >= 60
        ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400'
        : score >= 40
          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          : score >= 20
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'

  const bar =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-lime-500' :
    score >= 40 ? 'bg-yellow-500' :
    score >= 20 ? 'bg-orange-500' :
    'bg-red-500'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      <span className={`h-2 w-2 rounded-full ${bar}`} />
      {score} / 100
    </span>
  )
}

// ─── AI assessment panel ─────────────────────────────────────────────────────
function AiAssessment({ competitionId }: { competitionId: string }) {
  const { data, isLoading } = trpc.ai.triageAssess.useQuery(
    { competitionId },
    { staleTime: Infinity } // Cache for session — don't re-fetch when coming back
  )

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">KI analysiert…</span>
      </div>
    )
  }

  if (!data || data.score === null) {
    return (
      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gray-300 dark:text-gray-600" />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {data?.reason ?? 'Keine KI-Einschätzung verfügbar.'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3 dark:border-purple-900/30 dark:bg-purple-900/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400 dark:text-purple-500" />
          <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
            {data.reason}
          </p>
        </div>
        <ScoreBadge score={data.score} />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Competition = {
  id: string
  name: string
  organizer?: string | null
  deadline: Date | string | null
  type: string
  theme?: string | null
  prize?: string | null
  genres: string[]
  magazine?: { id: string; name: string } | null
}

export default function TriagePage() {
  const { toast } = useToast()

  // Load once from server
  const { data, isLoading } = trpc.competition.list.useQuery(
    { filters: { dismissed: false, starred: false, noSubmissions: true }, pagination: { take: 200 }, sort: 'created' },
    { staleTime: Infinity } // Don't refetch mid-session
  )

  // Local queue — filled once, then managed locally (prevents refetch bugs)
  const [queue, setQueue] = useState<Competition[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (data && queue === null) {
      setQueue(data.competitions as Competition[])
      setTotal(data.competitions.length)
    }
  }, [data, queue])

  // Prefetch AI assessment for next card
  const nextId = queue?.[1]?.id
  trpc.ai.triageAssess.useQuery(
    { competitionId: nextId! },
    { enabled: !!nextId, staleTime: Infinity }
  )

  // Dismiss modal state
  const [showDismissModal, setShowDismissModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [customReason, setCustomReason] = useState('')
  const customReasonRef = useRef<HTMLInputElement>(null)

  const starMutation = trpc.competition.star.useMutation()
  const dismissMutation = trpc.competition.dismiss.useMutation()

  const current = queue?.[0] ?? null
  const done = queue !== null && queue.length === 0

  const advance = () => setQueue(q => q ? q.slice(1) : [])

  const handleStar = async () => {
    if (!current) return
    try {
      await starMutation.mutateAsync({ id: current.id })
      toast(`„${current.name}" geplant ⭐`, 'success')
      advance()
    } catch {
      toast('Fehler beim Speichern — bitte nochmal versuchen.', 'error')
    }
  }

  const handleDismiss = async () => {
    if (!current) return
    const reason =
      customReason.trim() ||
      (selectedPreset !== null ? DISMISS_PRESETS[selectedPreset].label : undefined)
    try {
      await dismissMutation.mutateAsync({ id: current.id, reason })
      toast(`„${current.name}" abgelehnt`, 'success')
      setShowDismissModal(false)
      setSelectedPreset(null)
      setCustomReason('')
      advance()
    } catch {
      toast('Fehler beim Speichern — bitte nochmal versuchen.', 'error')
    }
  }

  const openDismissModal = () => {
    setSelectedPreset(null)
    setCustomReason('')
    setShowDismissModal(true)
  }

  // Focus custom input when modal opens
  useEffect(() => {
    if (showDismissModal) setTimeout(() => customReasonRef.current?.focus(), 50)
  }, [showDismissModal])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (!showDismissModal) {
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') {
          e.preventDefault(); handleStar()
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowLeft' || e.key === 'Backspace') {
          e.preventDefault(); openDismissModal()
        }
      } else {
        if (e.key === 'Escape') {
          setShowDismissModal(false)
        } else if (e.key >= '1' && e.key <= '7') {
          setSelectedPreset(parseInt(e.key) - 1)
          setCustomReason('')
        } else if (e.key === 'Enter') {
          e.preventDefault(); handleDismiss()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDismissModal, current, selectedPreset, customReason])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading || queue === null) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">Lade Ausschreibungen…</p>
        </div>
      </main>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-black dark:text-white">Triage abgeschlossen</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {total > 0 ? `Alle ${total} Ausschreibungen bewertet!` : 'Keine neuen Ausschreibungen.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => { setQueue(null) }}>
              Neu laden
            </Button>
            <Link href="/geplant"><Button variant="secondary">Zu Geplant</Button></Link>
          </div>
        </div>
      </main>
    )
  }

  // ── Card ─────────────────────────────────────────────────────────────────────
  const daysLeft = current.deadline ? daysUntil(new Date(current.deadline)) : null
  const processed = total - queue.length

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Triage</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Neue Ausschreibungen prüfen</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-light-surface px-4 py-1.5 text-sm font-medium text-gray-600 dark:bg-dark-surface dark:text-gray-300">
            <Inbox className="h-4 w-4" />
            {queue.length} übrig
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-accent-light transition-all duration-300 dark:bg-accent-dark"
            style={{ width: total > 0 ? `${(processed / total) * 100}%` : '0%' }}
          />
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-light-surface p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link href={`/wettbewerb/${current.id}`} target="_blank" className="group">
                <h2 className="text-xl font-bold text-black transition-colors group-hover:text-accent-light dark:text-white dark:group-hover:text-accent-dark">
                  {current.name}
                </h2>
              </Link>
              {current.organizer && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{current.organizer}</p>
              )}
            </div>

            {current.deadline && (
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${
                  daysLeft !== null && daysLeft <= 14
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {formatDateShort(new Date(current.deadline))}
                </p>
                {daysLeft !== null && daysLeft > 0 && (
                  <p className="text-xs text-gray-400">{daysLeft} Tage</p>
                )}
              </div>
            )}
          </div>

          {current.theme && (
            <p className="mt-3 text-sm italic text-gray-500 dark:text-gray-400">
              Thema: {current.theme}
            </p>
          )}
          {current.prize && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preis: {current.prize}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="default">{TYPE_LABELS[current.type] || current.type}</Badge>
            {current.magazine && <Badge variant="gold">{current.magazine.name}</Badge>}
            {current.genres?.length > 0 && (
              <Badge variant="sage">{current.genres.slice(0, 3).join(', ')}</Badge>
            )}
          </div>

          {/* AI assessment */}
          <AiAssessment competitionId={current.id} />
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={openDismissModal}
            disabled={dismissMutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-4 text-base font-semibold text-red-700 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <X className="h-5 w-5" />
            Ablehnen
            <kbd className="ml-1 rounded bg-red-200 px-1.5 py-0.5 font-mono text-xs dark:bg-red-900">D / ←</kbd>
          </button>

          <button
            onClick={handleStar}
            disabled={starMutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-yellow-300 bg-yellow-50 py-4 text-base font-semibold text-yellow-700 transition-all hover:bg-yellow-100 active:scale-95 disabled:opacity-50 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
          >
            <Star className="h-5 w-5 fill-current" />
            Planen
            <kbd className="ml-1 rounded bg-yellow-200 px-1.5 py-0.5 font-mono text-xs dark:bg-yellow-900">S / →</kbd>
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Titel öffnet Detailseite · KI-Einschätzung basiert auf deiner Einreichungshistorie
        </p>
      </div>

      {/* Dismiss modal */}
      {showDismissModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => e.target === e.currentTarget && setShowDismissModal(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-surface">
            <h3 className="mb-4 text-lg font-bold text-black dark:text-white">
              Grund für Ablehnung
            </h3>

            <div className="space-y-2">
              {DISMISS_PRESETS.map((preset, idx) => (
                <button
                  key={preset.key}
                  onClick={() => { setSelectedPreset(idx); setCustomReason('') }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors ${
                    selectedPreset === idx
                      ? 'bg-accent-light/10 text-accent-light ring-2 ring-accent-light dark:bg-accent-dark/10 dark:text-accent-dark dark:ring-accent-dark'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <kbd className="w-6 shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-center font-mono text-xs dark:bg-gray-600">
                    {preset.key}
                  </kbd>
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                ref={customReasonRef}
                type="text"
                placeholder="Oder eigenen Grund eingeben…"
                value={customReason}
                onChange={e => { setCustomReason(e.target.value); if (e.target.value) setSelectedPreset(null) }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-accent-light focus:outline-none focus:ring-1 focus:ring-accent-light dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowDismissModal(false)} className="flex-1">
                Abbrechen
                <kbd className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600">Esc</kbd>
              </Button>
              <Button
                variant="primary"
                onClick={handleDismiss}
                disabled={dismissMutation.isPending}
                className="flex-1"
              >
                Ablehnen
                <kbd className="ml-2 rounded bg-accent-light/20 px-1.5 py-0.5 font-mono text-xs">↵</kbd>
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
