import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface DashboardStats {
  totalCompetitions: number
  totalSubmissions: number
  acceptedSubmissions: number
}

interface CompetitionDisplay {
  id: string
  name: string
  deadline: Date | null
  type: string
  organizer?: string | null
}

async function getStats(): Promise<DashboardStats> {
  const [competitions, submissions, accepted] = await Promise.all([
    db.competition.count(),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
  ])

  return {
    totalCompetitions: competitions,
    totalSubmissions: submissions,
    acceptedSubmissions: accepted,
  }
}

async function getUpcomingDeadlines(): Promise<CompetitionDisplay[]> {
  const now = new Date()
  const competitions = await db.competition.findMany({
    where: {
      deadline: { gt: now },
      status: 'ACTIVE',
      dismissed: false,
    },
    select: {
      id: true,
      name: true,
      deadline: true,
      type: true,
      organizer: true,
    },
    orderBy: { deadline: 'asc' },
    take: 5,
  })

  return competitions
}

async function getLatestCompetitions(): Promise<CompetitionDisplay[]> {
  const competitions = await db.competition.findMany({
    where: {
      status: 'ACTIVE',
      dismissed: false,
    },
    select: {
      id: true,
      name: true,
      deadline: true,
      type: true,
      organizer: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return competitions
}

export default async function DashboardPage() {
  const [stats, upcomingDeadlines, latestCompetitions] = await Promise.all([
    getStats(),
    getUpcomingDeadlines(),
    getLatestCompetitions(),
  ])

  const typeLabels: Record<string, string> = {
    WETTBEWERB: 'Wettbewerb',
    ANTHOLOGIE: 'Anthologie',
    ZEITSCHRIFT: 'Zeitschrift',
  }

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Willkommen bei Literaturkompass 2.0
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Nächste Deadlines */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Nächste Deadlines
            </h2>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/geplant/${comp.id}`}
                    className="flex items-start justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-black dark:text-white">
                        {comp.name}
                      </h3>
                      {comp.organizer && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {comp.organizer}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-accent-light dark:text-accent-dark">
                        {comp.deadline
                          ? format(comp.deadline, 'dd. MMM yyyy', {
                              locale: de,
                            })
                          : 'TBD'}
                      </p>
                      <Badge variant="default" className="mt-1">
                        {typeLabels[comp.type] || comp.type}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Keine bevorstehenden Deadlines
              </p>
            )}

            <Link href="/entdecken" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                Alle anzeigen
              </Button>
            </Link>
          </section>

          {/* Neue Funde */}
          <section className="rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Neue Funde
            </h2>

            {latestCompetitions.length > 0 ? (
              <div className="space-y-3">
                {latestCompetitions.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/entdecken?id=${comp.id}`}
                    className="flex items-start justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-black dark:text-white">
                        {comp.name}
                      </h3>
                      {comp.organizer && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {comp.organizer}
                        </p>
                      )}
                    </div>
                    <Badge variant="accent" className="ml-4">
                      {typeLabels[comp.type] || comp.type}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Keine neuen Funde
              </p>
            )}

            <Link href="/entdecken" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                Alle anzeigen
              </Button>
            </Link>
          </section>
        </div>

        {/* Empfehlungen Section */}
        <section className="mt-8 rounded-lg bg-light-surface p-6 dark:bg-dark-surface">
          <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
            Empfehlungen
          </h2>
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
            <p className="text-gray-600 dark:text-gray-400">
              KI-gestützte Empfehlungen werden in Kürze verfügbar sein.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
