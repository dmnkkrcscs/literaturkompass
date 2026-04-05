'use client'

import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Trophy, ExternalLink, Pencil } from 'lucide-react'
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
  const [editUrl, setEditUrl] = useState('')

  const submissions = data?.submissions || []

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center">
            <Trophy className="h-16 w-16 text-gold" />
          </div>
          <h1 className="mt-4 text-4xl font-bold text-black dark:text-white">
            Hall of Fame
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Erfolgreiche Einreichungen
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border-2 border-gold/30 bg-light-surface p-6 dark:bg-dark-surface">
                <div className="h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine angenommenen Einreichungen. Aber bald!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border-2 border-gold bg-light-surface p-6 dark:bg-dark-surface"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-gold" />
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {sub.competition.name}
                      </h3>
                    </div>

                    {sub.title && (
                      <p className="mt-2 text-base italic text-gray-700 dark:text-gray-300">
                        &bdquo;{sub.title}&ldquo;
                      </p>
                    )}

                    {sub.documentName && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Dokument: {sub.documentName}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-sm">
                      {sub.submittedAt && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Eingereicht:{' '}
                          <span className="font-medium">
                            {format(new Date(sub.submittedAt), 'dd. MMMM yyyy', { locale: de })}
                          </span>
                        </p>
                      )}
                      {sub.responseAt && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Angenommen:{' '}
                          <span className="font-medium text-gold">
                            {format(new Date(sub.responseAt), 'dd. MMMM yyyy', { locale: de })}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Published URL */}
                    {sub.publishedUrl && editingId !== sub.id && (
                      <a
                        href={sub.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-light hover:underline dark:text-accent-dark"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Zur Veröffentlichung
                      </a>
                    )}

                    {/* Edit published URL */}
                    {editingId === sub.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: sub.id, publishedUrl: editUrl || null })}
                          loading={updateMutation.isPending}
                        >
                          Speichern
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(sub.id); setEditUrl(sub.publishedUrl || '') }}
                        className="mt-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-3 w-3" />
                        {sub.publishedUrl ? 'Link bearbeiten' : 'Link hinzufügen'}
                      </button>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    <div className="inline-block rounded-lg bg-gold/20 px-4 py-2">
                      <p className="text-sm font-semibold text-gold">Angenommen!</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {submissions.length > 0 && (
          <div className="mt-12 rounded-lg bg-gradient-to-r from-gold/10 to-gold/5 p-6 text-center dark:from-gold/5 dark:to-gold/0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gratulation zu deinen erfolgreichen Einreichungen!
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
