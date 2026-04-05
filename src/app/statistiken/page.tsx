import { db } from '@/lib/db'

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

const TYPE_LABELS: Record<string, string> = {
  WETTBEWERB: 'Wettbewerb',
  ANTHOLOGIE: 'Anthologie',
  ZEITSCHRIFT: 'Zeitschrift',
}

async function getPageData() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    totalCompetitions,
    totalSubmissions,
    acceptedSubmissions,
    competitionsByType,
    submissionsByMonthRaw,
  ] = await Promise.all([
    db.competition.count(),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
    db.competition.groupBy({
      by: ['type'],
      _count: true,
    }),
    // Use raw SQL for proper monthly grouping
    db.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*)::bigint as count
      FROM "Submission"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,
  ])

  const successRate = totalSubmissions > 0 ? acceptedSubmissions / totalSubmissions : 0

  const stats: StatsSummary = {
    totalCompetitions,
    totalSubmissions,
    acceptedSubmissions,
    successRate,
  }

  const byType: CompetitionByType[] = competitionsByType.map((comp) => ({
    type: TYPE_LABELS[comp.type] || comp.type,
    count: comp._count,
  }))

  const formatter = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' })
  const submissionsByMonth: SubmissionByMonth[] = submissionsByMonthRaw.map((item) => ({
    month: formatter.format(new Date(item.month)),
    count: Number(item.count),
  }))

  return { stats, byType, submissionsByMonth }
}

export default async function StatistikenPage() {
  const { stats, byType, submissionsByMonth } = await getPageData()

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
              {byType.map((comp) => (
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
