export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KanbanColumn {
  id: string
  label: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
  color: string
  bgColor: string
}

const columns: KanbanColumn[] = [
  {
    id: 'gemerkt',
    label: 'Gemerkt',
    status: 'PLANNED',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    id: 'in-arbeit',
    label: 'In Arbeit',
    status: 'IN_PROGRESS',
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  {
    id: 'eingereicht',
    label: 'Eingereicht',
    status: 'SUBMITTED',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
  },
  {
    id: 'ergebnis',
    label: 'Ergebnis',
    status: 'ACCEPTED',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
]

interface SubmissionCard {
  id: string
  competition: {
    name: string
    deadline: Date | null
  }
}

async function getSubmissionsByStatus(status: string): Promise<SubmissionCard[]> {
  return db.submission.findMany({
    where: { status: status as any },
    select: {
      id: true,
      competition: {
        select: {
          name: true,
          deadline: true,
        },
      },
    },
    orderBy: {
      competition: {
        deadline: 'asc',
      },
    },
  })
}

export default async function GeplantPage() {
  const [plannedSubmissions, inProgressSubmissions, submittedSubmissions, acceptedSubmissions] =
    await Promise.all([
      getSubmissionsByStatus('PLANNED'),
      getSubmissionsByStatus('IN_PROGRESS'),
      getSubmissionsByStatus('SUBMITTED'),
      getSubmissionsByStatus('ACCEPTED'),
    ])

  const submissionsByStatus = {
    PLANNED: plannedSubmissions,
    IN_PROGRESS: inProgressSubmissions,
    SUBMITTED: submittedSubmissions,
    ACCEPTED: acceptedSubmissions,
  }

  const colorByStatus = {
    PLANNED: 'blue',
    IN_PROGRESS: 'yellow',
    SUBMITTED: 'orange',
    ACCEPTED: 'green',
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Mein Plan
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Organisieren Sie Ihre Einreichungen mit dem Kanban-Board
          </p>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-6 overflow-x-auto md:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col rounded-lg bg-light-surface dark:bg-dark-surface"
            >
              {/* Column Header */}
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-black dark:text-white">
                  {column.label}
                </h2>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {submissionsByStatus[column.status].length} Einreichungen
                </p>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {submissionsByStatus[column.status].length === 0 ? (
                    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Keine Einträge
                      </p>
                    </div>
                  ) : (
                    submissionsByStatus[column.status].map((submission) => (
                      <Link
                        key={submission.id}
                        href={`/geplant/${submission.id}`}
                        className={`block rounded-lg p-4 transition-all hover:shadow-md ${column.bgColor} border border-gray-300 dark:border-gray-600`}
                      >
                        <h3 className="font-medium text-black dark:text-white">
                          {submission.competition.name}
                        </h3>
                        {submission.competition.deadline && (
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            {format(
                              new Date(submission.competition.deadline),
                              'dd. MMM yyyy',
                              { locale: de }
                            )}
                          </p>
                        )}
                        <Badge
                          variant="default"
                          className="mt-2 inline-block text-xs"
                        >
                          {column.label}
                        </Badge>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {Object.values(submissionsByStatus).every((s) => s.length === 0) && (
          <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
            <p className="text-gray-600 dark:text-gray-400">
              Noch keine Einreichungen geplant. Besuchen Sie{' '}
              <Link href="/entdecken" className="font-semibold text-accent-light dark:text-accent-dark">
                Entdecken
              </Link>
              {' '}um Ihre ersten Wettbewerbe zu finden.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
