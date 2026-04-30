'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Star, X, ArrowLeft, ArrowRight, CheckCircle, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { daysUntil, formatDateShort, TYPE_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

const DISMISS_PRESETS = [
  { key: '1', label: 'Falsches Genre' },
  { key: '2', label: 'Zu teuer / Gebühr' },
  { key: '3', label: 'Zu kurze Deadline' },
  { key: '4', label: 'Nicht mein Thema' },
  { key: '5', label: 'Altersbeschränkung' },
  { key: '6', label: 'Regionalbeschränkung' },
  { key: '7', label: 'Schlechte Qualität / Unseriös' },
]

export default function TriagePage() {
  const { toast } = useToast()
  const [index, setIndex] = useState(0)
  const [showDismissModal, setShowDismissModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [done, setDone] = useState(false)
  const customReasonRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = trpc.competition.list.useQuery({
    filters: { dismissed: false, starred: false, noSubmissions: true },
    pagination: { take: 200 },
    sort: 'created',
  })

  const starMutation = trpc.competition.star.useMutation()
  const dismissMutation = trpc.competition.dismiss.useMutation()

  const queue = data?.competitions ?? []
  const current = queue[index]
  const remaining = queue.length - index

  const advance = () => {
    if (index + 1 >= queue.length) {
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const handleStar = async () => {
    if (!current) return
    await starMutation.mutateAsync({ id: current.id })
    toast(`"${current.name}" geplant ⭐`, 'success')
    advance()
  }

  const handleDismiss = async () => {
    if (!current) return
    const reason =
      customReason.trim() ||
      (selectedPreset !== null ? DISMISS_PRESETS[selectedPreset].label : undefined)
    await dismissMutation.mutateAsync({ id: current.id, reason })
    toast(`"${current.name}" abgelehnt`, 'success')
    setShowDismissModal(false)
    setSelectedPreset(null)
    setCustomReason('')
    advance()
  }

  const openDismissModal = () => {
    setSelectedPreset(null)
    setCustomReason('')
    setShowDismissModal(true)
  }

  // Focus custom input when modal opens
  useEffect(() => {
    if (showDismissModal) {
      setTimeout(() => customReasonRef.current?.focus(), 50)
    }
  }, [showDismissModal])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (!showDismissModal) {
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') {
          e.preventDefault()
          handleStar()
        } else if (
          e.key === 'd' ||
          e.key === 'D' ||
          e.key === 'ArrowLeft' ||
          e.key === 'Backspace'
        ) {
          e.preventDefault()
          openDismissModal()
        }
      } else {
        if (e.key === 'Escape') {
          setShowDismissModal(false)
        } else if (e.key >= '1' && e.key <= '7') {
          const idx = parseInt(e.key) - 1
          setSelectedPreset(idx)
          setCustomReason('')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleDismiss()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDismissModal, current, selectedPreset, customReason])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-gray-600 dark:text-gray-400">Laden…</p>
        </div>
      </main>
    )
  }

  if (done || queue.length === 0) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-black dark:text-white">
            Triage abgeschlossen
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Keine neuen Ausschreibungen mehr zu prüfen.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => { setIndex(0); setDone(false); refetch() }}>
              Neu laden
            </Button>
            <Link href="/geplant">
              <Button variant="secondary">Zu Geplant</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const daysLeft = current.deadline ? daysUntil(new Date(current.deadline)) : null

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Triage</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Neue Ausschreibungen prüfen
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-light-surface px-4 py-1.5 text-sm font-medium text-gray-600 dark:bg-dark-surface dark:text-gray-300">
            <Inbox className="h-4 w-4" />
            {remaining} übrig
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-accent-light dark:bg-accent-dark transition-all duration-300"
            style={{ width: `${((index) / queue.length) * 100}%` }}
          />
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-light-surface p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link
                href={`/wettbewerb/${current.id}`}
                target="_blank"
                className="group"
              >
                <h2 className="text-xl font-bold text-black group-hover:text-accent-light dark:text-white dark:group-hover:text-accent-dark">
                  {current.name}
                </h2>
              </Link>
              {current.organizer && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {current.organizer}
                </p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {daysLeft} Tage
                  </p>
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
            <Badge variant="default">
              {TYPE_LABELS[current.type] || current.type}
            </Badge>
            {current.magazine && (
              <Badge variant="gold">{current.magazine.name}</Badge>
            )}
            {current.genres?.length > 0 && (
              <Badge variant="sage">
                {current.genres.slice(0, 3).join(', ')}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={openDismissModal}
            disabled={dismissMutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 py-4 text-base font-semibold text-red-700 transition-all hover:bg-red-100 active:scale-95 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
            Ablehnen
            <kbd className="ml-1 rounded bg-red-200 px-1.5 py-0.5 text-xs font-mono dark:bg-red-800">D / ←</kbd>
          </button>

          <button
            onClick={handleStar}
            disabled={starMutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-yellow-300 bg-yellow-50 py-4 text-base font-semibold text-yellow-700 transition-all hover:bg-yellow-100 active:scale-95 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 disabled:opacity-50"
          >
            <Star className="h-5 w-5 fill-current" />
            Planen
            <kbd className="ml-1 rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-mono dark:bg-yellow-800">S / →</kbd>
          </button>
        </div>

        {/* Skip hint */}
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Klick auf den Titel öffnet die Detailseite in einem neuen Tab
        </p>
      </div>

      {/* Dismiss Modal */}
      {showDismissModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDismissModal(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-surface">
            <h3 className="mb-4 text-lg font-bold text-black dark:text-white">
              Grund für Ablehnung
            </h3>

            <div className="space-y-2">
              {DISMISS_PRESETS.map((preset, idx) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    setSelectedPreset(idx)
                    setCustomReason('')
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors ${
                    selectedPreset === idx
                      ? 'bg-accent-light/10 text-accent-light ring-2 ring-accent-light dark:bg-accent-dark/10 dark:text-accent-dark dark:ring-accent-dark'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <kbd className="w-6 shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-center text-xs font-mono dark:bg-gray-600">
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
                onChange={(e) => {
                  setCustomReason(e.target.value)
                  if (e.target.value) setSelectedPreset(null)
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-accent-light focus:outline-none focus:ring-1 focus:ring-accent-light dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-accent-dark dark:focus:ring-accent-dark"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDismissModal(false)}
                className="flex-1"
              >
                Abbrechen
                <kbd className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-600">Esc</kbd>
              </Button>
              <Button
                variant="primary"
                onClick={handleDismiss}
                disabled={dismissMutation.isPending}
                className="flex-1"
              >
                Ablehnen
                <kbd className="ml-2 rounded bg-accent-light/20 px-1.5 py-0.5 text-xs font-mono">↵</kbd>
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
