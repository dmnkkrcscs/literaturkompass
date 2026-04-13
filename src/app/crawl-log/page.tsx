'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Copy, AlertTriangle } from 'lucide-react'

export default function CrawlLogPage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const { toast } = useToast()

  const sessionsQuery = trpc.crawl.sessions.useQuery({
    take: pageSize,
    skip: page * pageSize,
  })

  const triggerCrawl = trpc.crawl.trigger.useMutation({
    onSuccess: () => {
      toast('Crawl-Job wurde gestartet', 'success')
      sessionsQuery.refetch()
    },
    onError: (err) => toast(err.message, 'error'),
  })

  const sessions = sessionsQuery.data?.sessions || []
  const pagination = sessionsQuery.data?.pagination

  const formatDate = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Group sessions by date for visual grouping
  const groupedByDate: Record<string, typeof sessions> = {}
  for (const session of sessions) {
    const dateKey = formatDate(session.startedAt)
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = []
    groupedByDate[dateKey].push(session)
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Crawl Log
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Übersicht aller Quellenchecks mit Ergebnissen
            </p>
          </div>
          <Button
            onClick={() => triggerCrawl.mutate({})}
            loading={triggerCrawl.isPending}
            variant="primary"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Crawl starten
          </Button>
        </div>

        {/* Content */}
        {sessionsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Laden...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Noch keine Crawl-Durchläufe vorhanden
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Der Crawler läuft täglich um 08:00 Uhr automatisch, oder du kannst oben manuell einen starten.
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedByDate).map(([dateStr, dateSessions]) => (
              <div key={dateStr} className="mb-8">
                <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">
                  {dateStr}
                </h2>

                <div className="space-y-3">
                  {dateSessions.map((session, idx) => (
                    <div
                      key={`${session.sourceId}-${idx}`}
                      className="rounded-lg border border-gray-200 bg-light-surface p-4 dark:border-gray-700 dark:bg-dark-surface"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-black dark:text-white">
                              {session.sourceName}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTime(session.startedAt)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {session.successCount > 0 && (
                              <Badge variant="sage">
                                <CheckCircle className="mr-1 inline h-3 w-3" />
                                {session.successCount} neu
                              </Badge>
                            )}
                            {session.duplicateCount > 0 && (
                              <Badge variant="default">
                                <Copy className="mr-1 inline h-3 w-3" />
                                {session.duplicateCount} bekannt
                              </Badge>
                            )}
                            {session.irrelevantCount > 0 && (
                              <Badge variant="default">
                                <AlertTriangle className="mr-1 inline h-3 w-3" />
                                {session.irrelevantCount} irrelevant
                              </Badge>
                            )}
                            {session.failureCount > 0 && (
                              <Badge variant="wine">
                                <XCircle className="mr-1 inline h-3 w-3" />
                                {session.failureCount} fehlgeschlagen
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 text-right">
                          <p className="text-2xl font-bold text-black dark:text-white">
                            {session.totalUrls}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            URLs geprüft
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.total > pageSize && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination.skip + 1}–{Math.min(pagination.skip + pageSize, pagination.total)} von {pagination.total} Durchläufen
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
