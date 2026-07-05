'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Star, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SubmitDialog } from '@/components/competition/SubmitDialog'
import { CompetitionListCard } from '@/components/competition/CompetitionListCard'
import { useToast } from '@/components/ui/Toast'

export default function GeplantPage() {
  const { toast } = useToast()
  const [submitTarget, setSubmitTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.competition.list.useQuery({
    filters: { starred: true, dismissed: false, noSubmissions: true },
    pagination: { take: 100 },
    sort: 'deadline',
  })

  const competitions = data?.competitions || []

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
            {competitions.map((comp) => (
              <CompetitionListCard
                key={comp.id}
                id={comp.id}
                name={comp.name}
                organizer={comp.organizer}
                theme={comp.theme}
                type={comp.type}
                deadline={comp.deadline}
                inlineDeadline
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSubmitTarget({ id: comp.id, name: comp.name })}
                  >
                    <Send className="mr-1 h-4 w-4" />
                    Einreichen
                  </Button>
                }
              />
            ))}
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
              // Also refreshes offen/absagen/hall-of-fame (new submission)
              utils.competition.invalidate()
              utils.submission.invalidate()
            }}
          />
        )}
      </div>
    </main>
  )
}
