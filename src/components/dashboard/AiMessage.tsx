'use client'

import { trpc } from '@/lib/trpc'
import { RefreshCw, Sparkles, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDateShort } from '@/lib/utils'

export function AiMessage() {
  const { data, isLoading, refetch } = trpc.ai.dashboardMessage.useQuery(undefined, {
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })

  const refreshMutation = trpc.ai.refreshDashboardMessage.useMutation({
    onSuccess: () => refetch(),
  })

  return (
    <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/90 via-indigo-600/90 to-blue-600/90 p-[1px]">
      <div className="relative rounded-2xl bg-gradient-to-br from-purple-950/80 via-indigo-950/80 to-blue-950/80 backdrop-blur-xl p-6">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span className="text-xs font-medium text-purple-200">KI-Assistent</span>
            </div>
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="ml-auto rounded-full p-1.5 text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
              title="Neue Nachricht generieren"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-4/5 rounded bg-white/10" />
              <div className="h-4 w-3/5 rounded bg-white/10" />
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-white/90 font-light">
              {data?.message || 'Schreib weiter – jede Zeile zählt.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function AiRecommendations() {
  const { data, isLoading, refetch } = trpc.ai.recommendations.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1h
    retry: 1,
  })

  const refreshMutation = trpc.ai.refreshRecommendations.useMutation({
    onSuccess: () => refetch(),
  })

  return (
    <section className="rounded-2xl bg-light-surface dark:bg-dark-surface overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Empfehlungen</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Basiert auf deinem Profil und deinen Texten</p>
          </div>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="Neue Empfehlungen"
        >
          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : data?.recommendations && data.recommendations.length > 0 ? (
          <div className="space-y-2">
            {data.recommendations.map((rec: any) => (
              <Link
                key={rec.competitionId}
                href={`/wettbewerb/${rec.competitionId}`}
                className="group flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
              >
                {/* Score circle */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  rec.score >= 80
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : rec.score >= 60
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {rec.score}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-black dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {rec.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {rec.reason}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    {rec.deadline && (
                      <span>Deadline: {formatDateShort(new Date(rec.deadline))}</span>
                    )}
                    {rec.theme && <span>{rec.theme}</span>}
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-purple-500 dark:text-gray-600 dark:group-hover:text-purple-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Noch keine Empfehlungen verfügbar.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Empfehlungen werden generiert, sobald Wettbewerbe importiert sind.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
