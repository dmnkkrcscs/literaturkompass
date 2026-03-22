import { db } from '@/lib/db'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface StatsSummary {
  totalCompetitions: number
  totalSubmissions: number
  acceptedSubmissions: number
  successRate: number
}

interface SubmissionByMonth {
  month: string
  count: number
}

interface CompetitionByType {
  type: string
  count: number
}

async function getStatsSummary(): Promise<StatsSummary> {
  const [
    totalCompetitions,
    totalSubmissions,
    acceptedSubmissions,
  ] = await Promise.all([
    db.competition.count(),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
  ])

  const successRate =
    totalSubmissions > 0 ? acceptedSubmissions / totalSubmissions : 0

  return {
    totalCompetitions,
    totalSubmissions,
    acceptedSubmissions,
    successRate,
  }
}

async function getSubmissionsByMonth(): Promise<SubmissionByMonth[]> {
  const submissions = await db.submission.findMany({
    select: {
      createdAt: true,
    },
  })

  const byMonth: Record<string, number> = {}

  submissions.forEach((sub) => {
    const month = format(new Date(sub.createdAt), 'MMM yyyy', { locale: de })
    byMonth[month] = (byMonth[month] || 0) + 1
  })

  return Object.entries(byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month) - new Date(b.month))
}

async function getCompetitionsByType(): Promise<CompetitionByType[]> {
  const competitions = await db.competition.groupBy({
    by: ['type'],
    _count: true,
  })

  const typeLabels: Record<string, string> = {
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  return competitions.map((comp) => ({
    type: typeLabels[comp.type] || comp.type,
    count: comp._count,
  }))
}

export default async function StatistikenPage() {
  const [stats, submissionsByMonth, competitionsByType] = await Promise.all([
    getStatsSummary(),
    getSubmissionsByMonth(),
    getCompetitionsByType(),
  ])

  const maxSubmissions = Math.max(
    ...submissionsByMonth.map((m) => m.count),
    1
  )

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Statistiken
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Überblick über deine Aktivitäten
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Wettbewerbe
            </div>
            <div className="mt-2 text-3xl font-bold text-accent-light dark:text-accent-dark">
              {stats.totalCompetitions}
            </div>
          </div>

          <div className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Einreichungen
            </div>
            <div className="mt-2 text-3xl font-bold text-accent-light dark:text-accent-dark">
              {stats.totalSubmissions}
            </div>
          </div>

          <div className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Angenommen
            </div>
            <div className="mt-2 text-3xl font-bold text-gold">
              {stats.acceptedSubmissions}
            </div>
          </div>

          <div className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Erfolgsrate
            </div>
            <div className="mt-2 text-3xl font-bold text-sage">
              {(stats.successRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Wettbewerbe nach Typ */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Wettbewerbe nach Typ
            </h2>

            <div className="mt-6 space-y-4">
              {competitionsByType.map((comp) => (
                <div key={comp.type}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {comp.type}
                    </span>
                    <span className="text-sm font-bold text-black dark:text-white">
                      {comp.count}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-accent-light dark:bg-accent-dark"
                      style={{
                        width: `${(comp.count / stats.totalCompetitions) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Einreichungen pro Monat */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Einreichungen pro Monat
            </h2>

            <div className="mt-6 space-y-3">
              {submissionsByMonth.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Noch keine Daten
                </p>
              ) : (
                submissionsByMonth.map((month) => (
                  <div key={month.month}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {month.month}
                      </span>
                      <span className="text-sm font-bold text-black dark:text-white">
                        {month.count}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-sage"
                        style={{
                          width: `${(month.count / maxSubmissions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
