'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { formatDateShort, TYPE_LABELS } from '@/lib/utils'
import { XCircle, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

export default function AbsagenPage() {
  const { toast } = useToast()
  const { data, isLoading, refetch } = trpc.submission.list.useQuery({
    status: 'REJECTED',
    take: 200,
  })

  const updateMutation = trpc.submission.update.useMutation({
    onSuccess: () => {
      toast('Gespeichert!', 'success')
      setEditingId(null)
      refetch()
    },
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<{ title: string; notes: string }>({
    title: '',
    notes: '',
  })

  const startEditing = (sub: any) => {
    setEditingId(sub.id)
    setEditFields({ title: sub.title || '', notes: sub.notes || '' })
  }

  const saveEditing = () => {
    if (!editingId) return
    updateMutation.mutate({
      id: editingId,
      title: editFields.title || undefined,
      notes: editFields.notes || null,
    })
  }

  const submissions = data?.submissions || []

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            <h1 className="text-3xl font-bold text-black dark:text-white">Absagen</h1>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {submissions.length > 0
              ? `${submissions.length} abgelehnte Einreichung${submissions.length !== 1 ? 'en' : ''} — jede davon hat dich etwas gelehrt.`
              : 'Alle abgelehnten Einreichungen — nichts geht verloren.'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-light-surface p-6 dark:bg-dark-surface"
              >
                <div className="h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <XCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine Absagen. Weiter so!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub: any) => (
              <div
                key={sub.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-light-surface dark:border-gray-700 dark:bg-dark-surface"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 h-full w-1 bg-gray-300 dark:bg-gray-600" />

                {editingId === sub.id ? (
                  <div className="space-y-4 p-6 pl-7">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Titel
                      </label>
                      <input
                        type="text"
                        value={editFields.title}
                        onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Titel des Textes"
                        autoFocus
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-lg font-bold text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Notizen
                      </label>
                      <textarea
                        value={editFields.notes}
                        onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Was hast du mitgenommen? Feedback, Gedanken, ..."
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={saveEditing}
                        loading={updateMutation.isPending}
                      >
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
                  <div className="p-6 pl-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-black dark:text-white">
                          {sub.title ? (
                            <>&bdquo;{sub.title}&ldquo;</>
                          ) : (
                            <span className="italic text-gray-400">Ohne Titel</span>
                          )}
                        </p>

                        <Link href={`/wettbewerb/${sub.competition.id}`}>
                          <p className="mt-0.5 text-sm text-gray-600 transition-colors hover:text-accent-light dark:text-gray-400 dark:hover:text-accent-dark">
                            {sub.competition.name}
                            {sub.competition.organizer && (
                              <span className="text-gray-400 dark:text-gray-500">
                                {' '}· {sub.competition.organizer}
                              </span>
                            )}
                          </p>
                        </Link>

                        {sub.notes && (
                          <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
                            {sub.notes}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                          <Badge variant="default">
                            {TYPE_LABELS[sub.competition.type] || sub.competition.type}
                          </Badge>
                          {sub.submittedAt && (
                            <span>
                              Eingereicht: {formatDateShort(new Date(sub.submittedAt))}
                            </span>
                          )}
                          {sub.responseAt && (
                            <span>Absage: {formatDateShort(new Date(sub.responseAt))}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => startEditing(sub)}
                        className="shrink-0 rounded-lg p-2 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        title="Notiz bearbeiten"
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
