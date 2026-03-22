export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Trophy } from 'lucide-react'

interface AcceptedSubmission {
  id: string
  competition: {
    name: string
  }
  submittedAt: Date | null
  responseAt: Date | null
  documentName: string | null
}

async function getAcceptedSubmissions(): Promise<AcceptedSubmission[]> {
  return db.submission.findMany({
    where: { status: 'ACCEPTED' },
    select: {
      id: true,
      competition: {
        select: {
          name: true,
        },
      },
      submittedAt: true,
      responseAt: true,
      documentName: true,
    },
    orderBy: {
      responseAt: 'desc',
    },
  })
}

export default async function HallOfFamePage() {
  const acceptedSubmissions = await getAcceptedSubmissions()

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

        {/* Content */}
        {acceptedSubmissions.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Noch keine angenommenen Einreichungen. Aber bald! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-lg border-2 border-gold bg-light-surface p-6 dark:bg-dark-surface"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-gold" />
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {submission.competition.name}
                      </h3>
                    </div>

                    {submission.documentName && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Dokument: {submission.documentName}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-sm">
                      {submission.submittedAt && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Eingereicht:{' '}
                          <span className="font-medium">
                            {format(
                              new Date(submission.submittedAt),
                              'dd. MMMM yyyy',
                              { locale: de }
                            )}
                          </span>
                        </p>
                      )}
                      {submission.responseAt && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Angenommen:{' '}
                          <span className="font-medium text-gold">
                            {format(
                              new Date(submission.responseAt),
                              'dd. MMMM yyyy',
                              { locale: de }
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="inline-block rounded-lg bg-gold/20 px-4 py-2">
                      <p className="text-sm font-semibold text-gold">
                        Angenommen! 🎉
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 rounded-lg bg-gradient-to-r from-gold/10 to-gold/5 p-6 text-center dark:from-gold/5 dark:to-gold/0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Glückwunsch zu deinen erfolgreichen Einreichungen! 🌟
          </p>
        </div>
      </div>
    </main>
  )
}
