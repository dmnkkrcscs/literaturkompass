'use client'

import { trpc } from '@/lib/trpc'
import { RefreshCw } from 'lucide-react'

export function AiMessage() {
  const { data, isLoading, refetch } = trpc.ai.dashboardMessage.useQuery(undefined, {
    staleTime: 1000 * 60 * 30, // 30 min client-side cache
    retry: 1,
  })

  const refreshMutation = trpc.ai.refreshDashboardMessage.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) {
    return (
      <div className="mb-8 animate-pulse rounded-lg bg-gradient-to-r from-accent-light/10 to-gold/10 p-6 dark:from-accent-dark/10 dark:to-gold/10">
        <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
      </div>
    )
  }

  if (!data?.message) return null

  return (
    <div className="mb-8 rounded-lg bg-gradient-to-r from-accent-light/10 to-gold/10 p-6 dark:from-accent-dark/10 dark:to-gold/10">
      <div className="flex items-start justify-between gap-4">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
          {data.message}
        </p>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/50 hover:text-gray-600 dark:hover:bg-black/20 dark:hover:text-gray-300"
          title="Neue Nachricht generieren"
        >
          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
