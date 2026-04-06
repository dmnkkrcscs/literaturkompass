'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Star, Send } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SubmitDialog } from '@/components/competition/SubmitDialog'
import { useToast } from '@/components/ui/Toast'

export default function GeplantPage() {
  const { toast } = useToast()
  const [submitTarget, setSubmitTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const { data, isLoading, refetch } = trpc.competition.list.useQuery({
    filters: { starred: true, dismissed: false, noSubmissions: true },
    pagination: { take: 100 },
    sort: 'deadline',
  })

  const competitions = data?.competitions || []

  const typeLabels: Record<string, string> = {
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Geplant
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Deine gemerkten Ausschreibungen — hier kannst du Einreichungen erfassen.
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
        ) : competitions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <Star className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine Ausschreibungen gemerkt. Markiere Ausschreibungen unter{' '}
              <Link href="/entdecken" className="font-semibold text-accent-light dark:text-accent-dark">
                Entdecken
              </Link>{' '}
              mit einem Stern.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((comp) => {
              const daysLeft = comp.deadline
                ? Math.ceil((new Date(comp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div
                  key={comp.id}
                  className="rounded-lg border border-gray-200 bg-light-surface p-5 transition-all hover:shadow-md dark:border-gray-700 dark:bg-dark-surface"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/wettbewerb/${comp.id}`} className="flex-1">
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {comp.name}
                      </h3>
                      {comp.organizer && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {comp.organizer}
                        </p>
                      )}
                      {comp.theme && (
                        <p className="mt-1 text-sm italic text-gray-500 dark:text-gray-400">
                          {comp.theme}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="default">
                          {typeLabels[comp.type] || comp.type}
                        </Badge>
                        {comp.deadline && (
                          <span className={`text-sm font-medium ${
                            daysLeft !== null && daysLeft <= 7
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {format(new Date(comp.deadline), 'dd. MMM yyyy', { locale: de })}
                            {daysLeft !== null && daysLeft > 0 && (
                              <span className="ml-1">({daysLeft} Tage)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </Link>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSubmitTarget({ id: comp.id, name: comp.name })}
                      className="shrink-0"
                    >
                      <Send className="mr-1 h-4 w-4" />
                      Einreichen
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {submitTarget && (
          <SubmitDialog
            competitionId={submitTarget.id}
            competitionName={submitTarget.name}
            onClose={() => setSubmitTarget(null)}
            onSuccess={() => {
              setSubmitTarget(null)
              toast('Einreichung erfasst!', 'success')
              refetch()
            }}
          />
        )}
      </div>
    </main>
  )
}
