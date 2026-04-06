'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Clock, Check, X, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function OffenPage() {
  const { toast } = useToast()
  const [publishedUrlInput, setPublishedUrlInput] = useState<string | null>(null)
  const [publishedUrlValue, setPublishedUrlValue] = useState('')
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)
  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [textInputs, setTextInputs] = useState<Record<string, string>>({})

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

  const updateMutation = trpc.submission.update.useMutation({
    onSuccess: () => {
      toast('Text gespeichert!', 'success')
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

  const saveTextContent = (id: string) => {
    const text = textInputs[id]
    if (text === undefined) return
    updateMutation.mutate({ id, textContent: text || null })
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
              <div key={i} className="animate-pulse rounded-2xl bg-light-surface p-6 dark:bg-dark-surface">
                <div className="h-5 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
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
            {submissions.map((sub: any) => {
              const daysWaiting = sub.submittedAt
                ? Math.floor((Date.now() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
                : 0
              const hasText = !!sub.textContent || (textInputs[sub.id] !== undefined && textInputs[sub.id] !== '')
              const isExpanded = expandedText === sub.id

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-gray-200 bg-light-surface overflow-hidden dark:border-gray-700 dark:bg-dark-surface"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {sub.title && (
                          <p className="text-lg font-semibold text-black dark:text-white">
                            &bdquo;{sub.title}&ldquo;
                          </p>
                        )}
                        <Link href={`/wettbewerb/${sub.competition.id}`}>
                          <p className="mt-0.5 text-sm text-gray-600 hover:text-accent-light dark:text-gray-400 dark:hover:text-accent-dark transition-colors">
                            {sub.competition.name}
                          </p>
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {sub.submittedAt && (
                            <span>
                              Eingereicht: {format(new Date(sub.submittedAt), 'dd. MMM yyyy', { locale: de })}
                            </span>
                          )}
                          <Badge variant="default">
                            {daysWaiting} {daysWaiting === 1 ? 'Tag' : 'Tage'}
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
                      <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
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

                  {/* Text content toggle */}
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedText(null)
                      } else {
                        setExpandedText(sub.id)
                        if (textInputs[sub.id] === undefined && sub.textContent) {
                          setTextInputs(prev => ({ ...prev, [sub.id]: sub.textContent }))
                        }
                      }
                    }}
                    className="flex w-full items-center justify-between border-t border-gray-100 px-5 py-3 text-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FileText className="h-4 w-4" />
                      {sub.textContent ? 'Eingereichter Text vorhanden' : 'Text hinterlegen (für KI-Stilanalyse)'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/30">
                      <textarea
                        value={textInputs[sub.id] ?? sub.textContent ?? ''}
                        onChange={(e) => setTextInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Kopiere deinen eingereichten Text hier rein. Die KI analysiert deinen Stil und gibt dir bessere Empfehlungen..."
                        rows={8}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-black placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:border-gray-700 dark:bg-dark-bg dark:text-white dark:placeholder:text-gray-600 dark:focus:border-purple-700 dark:focus:ring-purple-900/30"
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {(textInputs[sub.id] ?? sub.textContent ?? '').length.toLocaleString('de-DE')} Zeichen
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => saveTextContent(sub.id)}
                          loading={updateMutation.isPending}
                          disabled={textInputs[sub.id] === undefined || textInputs[sub.id] === (sub.textContent ?? '')}
                        >
                          Speichern
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
