'use client'

import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { formatDateShort } from '@/lib/utils'
import { Trophy, ExternalLink, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'

export default function HallOfFamePage() {
  const { toast } = useToast()
  const { data, isLoading, refetch } = trpc.submission.list.useQuery({
    status: 'ACCEPTED',
    take: 100,
  })

  const updateMutation = trpc.submission.update.useMutation({
    onSuccess: () => {
      toast('Gespeichert!', 'success')
      setEditingId(null)
      refetch()
    },
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<{
    title: string
    publishedUrl: string
    notes: string
  }>({ title: '', publishedUrl: '', notes: '' })

  const submissions = data?.submissions || []

  const startEditing = (sub: any) => {
    setEditingId(sub.id)
    setEditFields({
      title: sub.title || '',
      publishedUrl: sub.publishedUrl || '',
      notes: sub.notes || '',
    })
  }

  const saveEditing = () => {
    if (!editingId) return
    updateMutation.mutate({
      id: editingId,
      title: editFields.title || undefined,
      publishedUrl: editFields.publishedUrl || null,
      notes: editFields.notes || null,
    })
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="mt-6 text-4xl font-bold text-black dark:text-white">
            Hall of Fame
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {submissions.length > 0
              ? `${submissions.length} erfolgreiche Veröffentlichung${submissions.length !== 1 ? 'en' : ''}`
              : 'Erfolgreiche Einreichungen'
            }
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-amber-200 bg-light-surface p-8 dark:border-amber-800 dark:bg-dark-surface">
                <div className="h-7 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-3 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine angenommenen Einreichungen. Aber bald!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub: any) => (
              <div
                key={sub.id}
                className="group relative overflow-hidden rounded-2xl border border-amber-200/60 bg-light-surface dark:border-amber-800/40 dark:bg-dark-surface"
              >
                {/* Gold accent bar */}
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-yellow-400 to-amber-600" />

                {editingId === sub.id ? (
                  /* ── Edit mode ── */
                  <div className="p-8 pl-7 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Titel</label>
                      <input
                        type="text"
                        value={editFields.title}
                        onChange={(e) => setEditFields(f => ({ ...f, title: e.target.value }))}
                        placeholder="Titel des Textes"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-lg font-bold text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Link zur Veröffentlichung</label>
                      <input
                        type="url"
                        value={editFields.publishedUrl}
                        onChange={(e) => setEditFields(f => ({ ...f, publishedUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Notizen</label>
                      <textarea
                        value={editFields.notes}
                        onChange={(e) => setEditFields(f => ({ ...f, notes: e.target.value }))}
                        placeholder="z.B. Erscheinungsdatum, Ausgabe, ..."
                        rows={2}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="primary" size="sm" onClick={saveEditing} loading={updateMutation.isPending}>
                        <Check className="mr-1 h-4 w-4" />
                        Speichern
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-4 w-4" />
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="p-8 pl-7">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Title */}
                        <h2 className="text-2xl font-bold text-black dark:text-white">
                          {sub.title
                            ? <>&bdquo;{sub.title}&ldquo;</>
                            : <span className="italic text-gray-400">Ohne Titel</span>
                          }
                        </h2>

                        {/* Competition / Magazine */}
                        <div className="mt-2">
                          <Link
                            href={`/wettbewerb/${sub.competition.id}`}
                            className="text-base text-gray-700 hover:text-accent-light dark:text-gray-300 dark:hover:text-accent-dark transition-colors"
                          >
                            {sub.competition.name}
                          </Link>
                          {sub.competition.organizer && (
                            <span className="text-gray-400 dark:text-gray-500"> · {sub.competition.organizer}</span>
                          )}
                        </div>

                        {/* Notes */}
                        {sub.notes && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">{sub.notes}</p>
                        )}

                        {/* Dates */}
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {sub.submittedAt && (
                            <span>Eingereicht: {formatDateShort(new Date(sub.submittedAt))}</span>
                          )}
                          {sub.responseAt && (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              Angenommen: {formatDateShort(new Date(sub.responseAt))}
                            </span>
                          )}
                        </div>

                        {/* Published URL + Edit */}
                        <div className="mt-4 flex items-center gap-3">
                          {sub.publishedUrl && (
                            <a
                              href={sub.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Zur Veröffentlichung
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => startEditing(sub)}
                        className="shrink-0 rounded-lg p-2 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
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
