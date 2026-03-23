'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  BookOpen,
  CheckCircle,
  Clock,
  Bookmark,
  Trophy,
  XCircle,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompetitionRef {
  id: string
  name: string
  organizer: string | null
  deadline: string | null
  type: string
  theme: string | null
  url: string
}

interface Submission {
  id: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
  notes: string | null
  submittedAt: string | null
  responseAt: string | null
  competition: CompetitionRef
}

interface ParsedNotes {
  titel?: string
  thema?: string
  publikation?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNotes(notes: string | null): ParsedNotes {
  if (!notes) return {}
  const result: ParsedNotes = {}
  notes.split('|').forEach((part) => {
    const colonIdx = part.indexOf(':')
    if (colonIdx === -1) return
    const key = part.slice(0, colonIdx).trim().toLowerCase()
    const value = part.slice(colonIdx + 1).trim()
    if (key === 'titel') result.titel = value
    else if (key === 'thema') result.thema = value
    else if (key === 'publikation') result.publikation = value
  })
  return result
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return format(new Date(iso), 'dd. MMM yyyy', { locale: de })
}

// ─── Submit Dialog ─────────────────────────────────────────────────────────

interface SubmitDialogProps {
  submission: Submission
  onClose: () => void
  onSave: (id: string, titel: string, publikation: string) => Promise<void>
}

function SubmitDialog({ submission, onClose, onSave }: SubmitDialogProps) {
  const parsed = parseNotes(submission.notes)
  const [titel, setTitel] = useState(parsed.titel || '')
  const [publikation, setPublikation] = useState(
    parsed.publikation || submission.competition.organizer || ''
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(submission.id, titel, publikation)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Einreichung erfassen
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ausschreibung</p>
            <p className="font-medium text-black dark:text-white">{submission.competition.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titel des eingereichten Textes
            </label>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z. B. Wenn die Stille spricht"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-light dark:focus:ring-accent-dark"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Publikation / Veranstalter
            </label>
            <input
              type="text"
              value={publikation}
              onChange={(e) => setPublikation(e.target.value)}
              placeholder="z. B. DUM – Das ultimative Magazin"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-light dark:focus:ring-accent-dark"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            loading={saving}
            disabled={!titel.trim()}
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

interface SubmittedCardProps {
  sub: Submission
  onZusage: (id: string) => void
  onAbsage: (id: string) => void
  onEdit: (sub: Submission) => void
  onDelete: (id: string) => void
}

function SubmittedCard({ sub, onZusage, onAbsage, onEdit, onDelete }: SubmittedCardProps) {
  const parsed = parseNotes(sub.notes)
  const comp = sub.competition

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border-l-4 border-l-wine shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Title */}
        {parsed.titel ? (
          <h3 className="text-xl font-bold text-black dark:text-white mb-1">
            „{parsed.titel}"
          </h3>
        ) : (
          <h3 className="text-base font-semibold text-gray-400 dark:text-gray-500 mb-1 italic">
            Kein Titel erfasst —{' '}
            <button onClick={() => onEdit(sub)} className="underline text-accent-light dark:text-accent-dark">
              hinzufügen
            </button>
          </h3>
        )}

        {/* Competition + theme */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {comp.name}
          {(parsed.thema || comp.theme) && (
            <span className="text-gray-400 dark:text-gray-500"> · {parsed.thema || comp.theme}</span>
          )}
        </p>

        {/* Publication + date */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
          {parsed.publikation && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              {parsed.publikation}
            </span>
          )}
          {sub.submittedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Eingereicht: {formatDate(sub.submittedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onZusage(sub.id)}
          className="bg-green-600 hover:bg-green-700 border-green-600 text-white gap-1.5"
        >
          <CheckCircle className="h-4 w-4" />
          Zusage
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAbsage(sub.id)}
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 gap-1.5"
        >
          <XCircle className="h-4 w-4" />
          Absage
        </Button>
        <button
          onClick={() => onEdit(sub)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
        >
          bearbeiten
        </button>
        <Link
          href={comp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-accent-light dark:hover:text-accent-dark"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
        <button
          onClick={() => onDelete(sub.id)}
          className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface AcceptedCardProps {
  sub: Submission
  onDelete: (id: string) => void
}

function AcceptedCard({ sub, onDelete }: AcceptedCardProps) {
  const parsed = parseNotes(sub.notes)
  const comp = sub.competition

  return (
    <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10 border border-gold/40 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Trophy className="h-6 w-6 text-gold shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {parsed.titel && (
              <h3 className="text-xl font-bold text-black dark:text-white mb-1">
                „{parsed.titel}"
              </h3>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {parsed.publikation
                ? <>Akzeptiert für <strong>{parsed.publikation}</strong></>
                : <>Akzeptiert bei <strong>{comp.name}</strong></>
              }
              {(parsed.thema || comp.theme) && (
                <span className="text-gray-500 dark:text-gray-400"> · Thema: {parsed.thema || comp.theme}</span>
              )}
            </p>
            {sub.responseAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatDate(sub.responseAt)}
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(sub.id)}
            className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface RejectedCardProps {
  sub: Submission
  onDelete: (id: string) => void
}

function RejectedCard({ sub, onDelete }: RejectedCardProps) {
  const parsed = parseNotes(sub.notes)
  const comp = sub.competition

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm opacity-70 overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {parsed.titel ? (
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 line-through">
              „{parsed.titel}"
            </p>
          ) : null}
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{comp.name}</p>
        </div>
        <button
          onClick={() => onDelete(sub.id)}
          className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface PlannedCardProps {
  sub: Submission
  onMarkSubmitted: (sub: Submission) => void
  onDelete: (id: string) => void
}

function PlannedCard({ sub, onMarkSubmitted, onDelete }: PlannedCardProps) {
  const comp = sub.competition

  const deadline = comp.deadline ? new Date(comp.deadline) : null
  const days = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const typeColors: Record<string, string> = {
    WETTBEWERB: 'border-l-wine',
    ANTHOLOGIE: 'border-l-sage',
    ZEITSCHRIFT: 'border-l-gold',
  }

  return (
    <div
      className={`rounded-xl bg-white dark:bg-gray-900 border-l-4 ${typeColors[comp.type] || 'border-l-gray-300'} shadow-sm overflow-hidden`}
    >
      <div className="p-4 flex items-center gap-3">
        <Bookmark className="h-5 w-5 text-accent-light dark:text-accent-dark shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-black dark:text-white truncate">{comp.name}</p>
          {comp.organizer && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{comp.organizer}</p>
          )}
          {deadline && (
            <p
              className={`text-xs mt-0.5 font-medium ${
                days !== null && days <= 7
                  ? 'text-orange-500'
                  : days !== null && days <= 30
                  ? 'text-yellow-500'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {days !== null && days < 0
                ? 'Deadline abgelaufen'
                : days !== null
                ? `${days} Tage verbleibend · ${formatDate(comp.deadline)}`
                : formatDate(comp.deadline)}
            </p>
          )}
          {comp.type === 'ZEITSCHRIFT' && !deadline && (
            <p className="text-xs text-gold mt-0.5">Laufende Einreichungen</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onMarkSubmitted(sub)}
            className="text-xs font-medium text-accent-light dark:text-accent-dark hover:underline"
          >
            Eingereicht
          </button>
          <button
            onClick={() => onDelete(sub.id)}
            className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  color = 'gray',
}: {
  icon: React.ElementType
  title: string
  count: number
  color?: string
}) {
  const colorMap: Record<string, string> = {
    wine: 'text-wine',
    gold: 'text-gold',
    sage: 'text-sage',
    accent: 'text-accent-light dark:text-accent-dark',
    gray: 'text-gray-500 dark:text-gray-400',
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-5 w-5 ${colorMap[color] || colorMap.gray}`} />
      <h2 className="text-lg font-semibold text-black dark:text-white">{title}</h2>
      <span className="ml-1 text-sm text-gray-400 dark:text-gray-500">({count})</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function GeplantPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogSub, setDialogSub] = useState<Submission | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: status as Submission['status'] } : s))
    )
  }

  const saveSubmissionDetails = async (id: string, titel: string, publikation: string) => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUBMITTED', titel, publikation, submittedAt: new Date().toISOString() }),
    })
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const parts: string[] = []
        if (titel) parts.push(`Titel: ${titel}`)
        const comp = s.competition
        if (comp.theme) parts.push(`Thema: ${comp.theme}`)
        if (publikation) parts.push(`Publikation: ${publikation}`)
        return {
          ...s,
          status: 'SUBMITTED',
          notes: parts.join(' | '),
          submittedAt: new Date().toISOString(),
        }
      })
    )
  }

  const deleteSubmission = async (id: string) => {
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
  }

  const submitted = submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'IN_PROGRESS')
  const accepted = submissions.filter((s) => s.status === 'ACCEPTED')
  const rejected = submissions.filter((s) => s.status === 'REJECTED')
  const planned = submissions.filter((s) => s.status === 'PLANNED')

  if (loading) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-light-surface dark:bg-dark-surface animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  const isEmpty = submissions.length === 0

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
            Meine Einreichungen
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Verwalte deine Einreichungen und deren Status
          </p>
        </div>

        {isEmpty ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bookmark className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              Noch keine Ausschreibungen vorgemerkt
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Klicke auf „Merken" bei einer Ausschreibung in{' '}
              <Link href="/entdecken" className="text-accent-light dark:text-accent-dark hover:underline font-medium">
                Entdecken
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Eingereicht */}
            {submitted.length > 0 && (
              <section>
                <SectionHeader icon={Clock} title="Eingereicht" count={submitted.length} color="wine" />
                <div className="space-y-3">
                  {submitted.map((sub) => (
                    <SubmittedCard
                      key={sub.id}
                      sub={sub}
                      onZusage={(id) => updateStatus(id, 'ACCEPTED')}
                      onAbsage={(id) => updateStatus(id, 'REJECTED')}
                      onEdit={setDialogSub}
                      onDelete={deleteSubmission}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Angenommen */}
            {accepted.length > 0 && (
              <section>
                <SectionHeader icon={Trophy} title="Angenommen" count={accepted.length} color="gold" />
                <div className="space-y-3">
                  {accepted.map((sub) => (
                    <AcceptedCard key={sub.id} sub={sub} onDelete={deleteSubmission} />
                  ))}
                </div>
              </section>
            )}

            {/* Vorgemerkt */}
            {planned.length > 0 && (
              <section>
                <SectionHeader
                  icon={Bookmark}
                  title="Vorgemerkt"
                  count={planned.length}
                  color="accent"
                />
                <div className="space-y-2">
                  {planned.map((sub) => (
                    <PlannedCard
                      key={sub.id}
                      sub={sub}
                      onMarkSubmitted={(s) => setDialogSub(s)}
                      onDelete={deleteSubmission}
                    />
                  ))}
                </div>
                <Link href="/entdecken" className="mt-4 flex items-center gap-1.5 text-sm text-accent-light dark:text-accent-dark hover:underline">
                  <Plus className="h-4 w-4" />
                  Weitere Ausschreibungen entdecken
                </Link>
              </section>
            )}

            {/* Abgelehnt */}
            {rejected.length > 0 && (
              <section>
                <SectionHeader icon={XCircle} title="Abgelehnt" count={rejected.length} color="gray" />
                <div className="space-y-2">
                  {rejected.map((sub) => (
                    <RejectedCard key={sub.id} sub={sub} onDelete={deleteSubmission} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {!isEmpty && planned.length === 0 && (
          <div className="mt-8">
            <Link
              href="/entdecken"
              className="flex items-center gap-1.5 text-sm text-accent-light dark:text-accent-dark hover:underline"
            >
              <Plus className="h-4 w-4" />
              Neue Ausschreibung vormerken
            </Link>
          </div>
        )}

      </div>

      {/* Submit Dialog */}
      {dialogSub && (
        <SubmitDialog
          submission={dialogSub}
          onClose={() => setDialogSub(null)}
          onSave={saveSubmissionDetails}
        />
      )}
    </main>
  )
}
