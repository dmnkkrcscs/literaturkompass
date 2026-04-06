'use client'

import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { formatDateShort } from '@/lib/utils'
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

                <div className="p-8 pl-7">
                  {/* Title - large and prominent */}
                  <h2 className="text-2xl font-bold text-black dark:text-white">
                    {sub.title
                      ? <>&bdquo;{sub.title}&ldquo;</>
                      : <span className="italic text-gray-400">Ohne Titel</span>
                    }
                  </h2>

                  {/* Competition / Magazine + Theme */}
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

                  {/* Dates */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {sub.submittedAt && (
                      <span>
                        Eingereicht: {formatDateShort(new Date(sub.submittedAt))}
                      </span>
                    )}
                    {sub.responseAt && (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Angenommen: {formatDateShort(new Date(sub.responseAt))}
                      </span>
                    )}
                  </div>

                  {/* Published URL */}
                  {editingId === sub.id ? (
                    <div className="mt-4 flex gap-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateMutation.mutate({ id: sub.id, publishedUrl: editUrl || null })
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
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
                      <button
                        onClick={() => { setEditingId(sub.id); setEditUrl(sub.publishedUrl || '') }}
                        className="inline-flex items-center gap-1 text-sm text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-3 w-3" />
                        {sub.publishedUrl ? 'Bearbeiten' : 'Link hinzufügen'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
