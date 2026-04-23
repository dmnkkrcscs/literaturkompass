'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * KI-Recherche overview — one row per crawl run (all sources aggregated).
 * Replaces the older per-source session list; that data still exists in
 * the `crawl.sessions` tRPC query if we want a drill-down later.
 */
export default function CrawlLogPage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const { toast } = useToast()

  const runsQuery = trpc.crawl.runs.useQuery({
    take: pageSize,
    skip: page * pageSize,
  })

  const triggerCrawl = trpc.crawl.trigger.useMutation({
    onSuccess: () => {
      toast('Recherche wurde gestartet', 'success')
      // The job is queued; new logs will appear after the worker processes it.
      // Refetch shortly — the list won't show the new run until logs exist.
      setTimeout(() => runsQuery.refetch(), 2000)
    },
    onError: (err) => toast(err.message, 'error'),
  })

  const runs = runsQuery.data?.runs || []
  const pagination = runsQuery.data?.pagination

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const totalSec = Math.round(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    if (m === 0) return `${s}s`
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              KI-Recherche
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Verlauf der automatischen Award-Recherchen
            </p>
          </div>
          <Button
            onClick={() => triggerCrawl.mutate({})}
            loading={triggerCrawl.isPending}
            variant="primary"
          >
            <Search className="mr-2 h-4 w-4" />
            Recherche starten
          </Button>
        </div>

        {/* Content */}
        {runsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Laden...</div>
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Noch keine Recherchen vorhanden
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Der Crawler läuft täglich um 08:00 Uhr automatisch, oder du kannst oben manuell einen Durchlauf starten.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-light-surface dark:border-gray-700 dark:bg-dark-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="px-4 py-3">Zeitpunkt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Auslöser</th>
                    <th className="px-4 py-3 text-right">Dauer</th>
                    <th className="px-4 py-3 text-right">Gefunden</th>
                    <th className="px-4 py-3 text-right">Neu gespeichert</th>
                    <th className="px-4 py-3 text-right">Deadline-Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {runs.map((run, idx) => (
                    <tr
                      key={`${run.startedAt}-${idx}`}
                      className="text-black dark:text-white"
                    >
                      <td className="px-4 py-3 font-medium">
                        {formatDateTime(run.endedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="sage">{run.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {run.triggeredBy
                          ? `${run.trigger} (${run.triggeredBy})`
                          : run.trigger}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {run.totalUrls}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-sage">
                        {run.successCount > 0 ? `+${run.successCount}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                        {run.deadlineUpdates}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total > pageSize && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination.skip + 1}–
                  {Math.min(pagination.skip + pageSize, pagination.total)} von{' '}
                  {pagination.total} Durchläufen
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
