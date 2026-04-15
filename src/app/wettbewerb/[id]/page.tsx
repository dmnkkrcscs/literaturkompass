'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Star,
  ExternalLink,
  Pencil,
  X,
  Save,
  ArrowLeft,
  Send,
  Calendar,
  Tag,
  Award,
  FileText,
  Globe,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SubmitDialog } from '@/components/competition/SubmitDialog'
import { DismissDialog } from '@/components/competition/DismissDialog'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'

export default function WettbewerbPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [editing, setEditing] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})

  const { data: competition, isLoading, refetch } = trpc.competition.byId.useQuery({ id })

  const starMutation = trpc.competition.star.useMutation({
    onSuccess: () => refetch(),
  })

  const updateMutation = trpc.competition.update.useMutation({
    onSuccess: () => {
      toast('Gespeichert!', 'success')
      setEditing(false)
      refetch()
    },
  })

  const typeLabels: Record<string, string> = {
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-32 w-full rounded bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>
      </main>
    )
  }

  if (!competition) {
    return (
      <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Ausschreibung nicht gefunden.</p>
          <Link href="/entdecken" className="mt-4 inline-block text-accent-light dark:text-accent-dark">
            Zurück zum Entdecken
          </Link>
        </div>
      </main>
    )
  }

  const isInternalUrl = competition.url.includes('literaturkompass.internal') || competition.url.includes('neonwilderness')
  const daysLeft = competition.deadline
    ? (() => {
        const deadlineEnd = new Date(competition.deadline)
        deadlineEnd.setHours(23, 59, 59, 999)
        return Math.ceil((deadlineEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })()
    : null

  const handleSave = () => {
    updateMutation.mutate({ id, ...editData })
  }

  const field = (key: string, fallback: any = '') => {
    return key in editData ? editData[key] : (competition as any)[key] ?? fallback
  }

  const setField = (key: string, value: any) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={field('name')}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-2xl font-bold text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
              />
            ) : (
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {competition.name}
              </h1>
            )}
            {editing ? (
              <input
                type="text"
                value={field('organizer', '')}
                onChange={(e) => setField('organizer', e.target.value)}
                placeholder="Organisator"
                className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-1 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
              />
            ) : (
              competition.organizer && (
                <p className="mt-1 text-gray-600 dark:text-gray-400">{competition.organizer}</p>
              )
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => starMutation.mutate({ id })}
              className={`rounded-lg p-2 transition-colors ${
                competition.starred
                  ? 'bg-gold/20 text-gold'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gold dark:hover:bg-gray-800'
              }`}
            >
              <Star className="h-5 w-5" fill={competition.starred ? 'currentColor' : 'none'} />
            </button>

            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={handleSave} loading={updateMutation.isPending}>
                  <Save className="mr-1 h-4 w-4" />
                  Speichern
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setEditData({}) }}>
                  Abbrechen
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Bearbeiten
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDismissDialog(true)}>
                  <Ban className="mr-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Type + Deadline */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant={
            competition.type === 'WETTBEWERB' ? 'wine' :
            competition.type === 'ANTHOLOGIE' ? 'sage' : 'gold'
          }>
            {typeLabels[competition.type] || competition.type}
          </Badge>

          {competition.submissions.some((s: any) => ['SUBMITTED', 'ACCEPTED'].includes(s.status)) && (
            <Badge variant="submitted">Bereits eingereicht</Badge>
          )}

          {(competition as any).magazine && (
            <Link href="/zeitschriften">
              <Badge variant="gold">{(competition as any).magazine.name}</Badge>
            </Link>
          )}

          {competition.deadline && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              daysLeft !== null && daysLeft <= 0
                ? 'text-red-600 dark:text-red-400'
                : daysLeft !== null && daysLeft <= 7
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}>
              <Calendar className="h-4 w-4" />
              {format(new Date(competition.deadline), 'dd. MMMM yyyy', { locale: de })}
              {daysLeft !== null && daysLeft > 0 && (
                <span className="ml-1">({daysLeft} Tage)</span>
              )}
              {daysLeft !== null && daysLeft <= 0 && (
                <span className="ml-1">(abgelaufen)</span>
              )}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-lg bg-light-surface p-5 dark:bg-dark-surface">
            {/* Theme */}
            <div>
              <div className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <Tag className="h-3 w-3" /> Thema
              </div>
              {editing ? (
                <input
                  type="text"
                  value={field('theme', '')}
                  onChange={(e) => setField('theme', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                />
              ) : (
                <p className="mt-1 text-sm text-black dark:text-white">
                  {competition.theme || 'Nicht angegeben'}
                </p>
              )}
            </div>

            {/* Genres */}
            <div>
              <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Genres</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {competition.genres.length > 0 ? (
                  competition.genres.map((g) => (
                    <Badge key={g} variant="sage">{g}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Keine angegeben</span>
                )}
              </div>
            </div>

            {/* Prize */}
            <div>
              <div className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <Award className="h-3 w-3" /> Preis
              </div>
              {editing ? (
                <input
                  type="text"
                  value={field('prize', '')}
                  onChange={(e) => setField('prize', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                />
              ) : (
                <p className="mt-1 text-sm text-black dark:text-white">
                  {competition.prize || 'Nicht angegeben'}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-lg bg-light-surface p-5 dark:bg-dark-surface">
            {/* Max Length */}
            <div>
              <div className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <FileText className="h-3 w-3" /> Max. Länge
              </div>
              {editing ? (
                <input
                  type="text"
                  value={field('maxLength', '')}
                  onChange={(e) => setField('maxLength', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                />
              ) : (
                <p className="mt-1 text-sm text-black dark:text-white">
                  {competition.maxLength || 'Nicht angegeben'}
                </p>
              )}
            </div>

            {/* Requirements */}
            <div>
              <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Anforderungen</div>
              {editing ? (
                <textarea
                  value={field('requirements', '')}
                  onChange={(e) => setField('requirements', e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                />
              ) : (
                <p className="mt-1 text-sm text-black dark:text-white">
                  {competition.requirements || 'Keine besonderen'}
                </p>
              )}
            </div>

            {/* Fee */}
            <div>
              <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Gebühr</div>
              <p className="mt-1 text-sm text-black dark:text-white">
                {competition.fee || 'Keine'}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {(competition.description || editing) && (
          <div className="mb-6 rounded-lg bg-light-surface p-5 dark:bg-dark-surface">
            <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Beschreibung</div>
            {editing ? (
              <textarea
                value={field('description', '')}
                onChange={(e) => setField('description', e.target.value)}
                rows={5}
                className="mt-2 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-bg dark:text-white"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-black dark:text-white">
                {competition.description}
              </p>
            )}
          </div>
        )}

        {/* External Link */}
        <div className="mb-6 flex flex-wrap gap-3">
          {!isInternalUrl ? (
            <>
              <a
                href={competition.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-light px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-light/90 dark:bg-accent-dark dark:hover:bg-accent-dark/90"
              >
                <ExternalLink className="h-4 w-4" />
                Zur Ausschreibung
              </a>
              {editing && (
                <input
                  type="url"
                  value={field('url', competition.url)}
                  onChange={(e) => setField('url', e.target.value)}
                  placeholder="https://..."
                  className="rounded border px-2 py-1 text-sm flex-1 min-w-[200px]"
                />
              )}
            </>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <Globe className="h-4 w-4" />
              Externer Link fehlt
              {editing && (
                <input
                  type="url"
                  value={field('url', '')}
                  onChange={(e) => setField('url', e.target.value)}
                  placeholder="https://..."
                  className="ml-2 rounded border px-2 py-1 text-sm"
                />
              )}
            </div>
          )}

          {!competition.dismissed && (
            <Button
              variant="primary"
              onClick={() => setShowSubmitDialog(true)}
            >
              <Send className="mr-1 h-4 w-4" />
              Einreichen
            </Button>
          )}
        </div>

        {/* Dialogs */}
        {showSubmitDialog && (
          <SubmitDialog
            competitionId={id}
            competitionName={competition.name}
            onClose={() => setShowSubmitDialog(false)}
            onSuccess={() => {
              setShowSubmitDialog(false)
              toast('Einreichung erfasst!', 'success')
              refetch()
            }}
          />
        )}

        {showDismissDialog && (
          <DismissDialog
            competitionId={id}
            competitionName={competition.name}
            onClose={() => setShowDismissDialog(false)}
            onSuccess={() => {
              setShowDismissDialog(false)
              toast('Ausschreibung ausgeblendet.', 'info')
              router.push('/entdecken')
            }}
          />
        )}
      </div>
    </main>
  )
}
