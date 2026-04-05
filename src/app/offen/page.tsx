'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Clock, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function OffenPage() {
  const { toast } = useToast()
  const [publishedUrlInput, setPublishedUrlInput] = useState<string | null>(null)
  const [publishedUrlValue, setPublishedUrlValue] = useState('')
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)

  const { data, isLoading, refetch } = trpc.submission.listOpen.useQuery()

  const markResultMutation = trpc.submission.markResult.useMutation({
    onSuccess: (data) => {
      const status = data.status === 'ACCEPTED' ? 'Zusage' : 'Absage'
      toast(`${status} gespeichert!`, data.status === 'ACCEPTED' ? 'success' : 'info')
      setActiveSubmissionId(null)
      setPublishedUrlInput(null)
      refetch()
    },
  })

  const handleAccept = (id: string) => {
    setActiveSubmissionId(id)
    setPublishedUrlInput(id)
    setPublishedUrlValue('')
  }

  const confirmAccept = () => {
    if (!activeSubmissionId) return
    markResultMutation.mutate({
      id: activeSubmissionId,
      status: 'ACCEPTED',
      publishedUrl: publishedUrlValue || undefined,
    })
  }

  const handleReject = (id: string) => {
    markResultMutation.mutate({ id, status: 'REJECTED' })
  }

  const submissions = data || []

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Offene Einreichungen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Eingereichte Texte, die auf Antwort warten.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
                <div className="h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Keine offenen Einreichungen. Reiche Texte unter{' '}
              <Link href="/geplant" className="font-semibold text-accent-light dark:text-accent-dark">
                Geplant
              </Link>{' '}
              ein.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const daysWaiting = sub.submittedAt
                ? Math.floor((Date.now() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
                : 0

              return (
                <div
                  key={sub.id}
                  className="rounded-lg border border-gray-200 bg-light-surface p-5 dark:border-gray-700 dark:bg-dark-surface"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link href={`/wettbewerb/${sub.competition.id}`}>
                        <h3 className="font-semibold text-black hover:text-accent-light dark:text-white dark:hover:text-accent-dark">
                          {sub.competition.name}
                        </h3>
                      </Link>
                      {sub.title && (
                        <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">
                          &bdquo;{sub.title}&ldquo;
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {sub.submittedAt && (
                          <span>
                            Eingereicht: {format(new Date(sub.submittedAt), 'dd. MMM yyyy', { locale: de })}
                          </span>
                        )}
                        <Badge variant="default">
                          {daysWaiting} Tage wartend
                        </Badge>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(sub.id)}
                        disabled={markResultMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Zusage
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(sub.id)}
                        disabled={markResultMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Absage
                      </Button>
                    </div>
                  </div>

                  {/* Published URL input for acceptance */}
                  {publishedUrlInput === sub.id && (
                    <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Link zur Veröffentlichung (optional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={publishedUrlValue}
                          onChange={(e) => setPublishedUrlValue(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-dark-bg dark:text-white"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={confirmAccept}
                          loading={markResultMutation.isPending}
                        >
                          Bestätigen
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setPublishedUrlInput(null); setActiveSubmissionId(null) }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
