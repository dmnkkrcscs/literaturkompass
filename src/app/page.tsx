export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDateShort, TYPE_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AiMessage, AiRecommendations } from '@/components/dashboard/AiMessage'
import { excludeMagazineRoots } from '@/server/lib/competition-filters'

interface DashboardStats {
  totalCompetitions: number
  totalSubmissions: number
  acceptedSubmissions: number
  openSubmissions: number
  starredCount: number
}

interface CompetitionDisplay {
  id: string
  name: string
  deadline: Date | null
  type: string
  organizer?: string | null
}

async function getStats(): Promise<DashboardStats> {
  const [competitions, submissions, accepted, open, starred] = await Promise.all([
    db.competition.count({ where: { status: 'ACTIVE', dismissed: false, ...excludeMagazineRoots } }),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
    db.submission.count({ where: { status: 'SUBMITTED' } }),
    db.competition.count({ where: { starred: true, dismissed: false, ...excludeMagazineRoots } }),
  ])

  return {
    totalCompetitions: competitions,
    totalSubmissions: submissions,
    acceptedSubmissions: accepted,
    openSubmissions: open,
    starredCount: starred,
  }
}

async function getUpcomingDeadlines(): Promise<CompetitionDisplay[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return db.competition.findMany({
    where: {
      deadline: { gte: today },
      status: 'ACTIVE',
      dismissed: false,
      ...excludeMagazineRoots,
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
}

async function getLatestCompetitions(): Promise<CompetitionDisplay[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return db.competition.findMany({
    where: {
      status: 'ACTIVE',
      dismissed: false,
      ...excludeMagazineRoots,
      // Hide expired deadlines unless the competition is starred
      OR: [
        { deadline: { gte: today } },
        { deadline: null },
        { starred: true },
      ],
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
}

export default async function DashboardPage() {
  const [stats, upcomingDeadlines, latestCompetitions] = await Promise.all([
    getStats(),
    getUpcomingDeadlines(),
    getLatestCompetitions(),
  ])

  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* AI Recommendation Banner */}
        <AiMessage />

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Ausschreibungen</div>
            <div className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
              {stats.totalCompetitions}
            </div>
          </div>
          <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Geplant</div>
            <div className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
              {stats.starredCount}
            </div>
          </div>
          <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Eingereicht</div>
            <div className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
              {stats.totalSubmissions}
            </div>
          </div>
          <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Offen</div>
            <div className="mt-1 text-2xl font-bold text-accent-light dark:text-accent-dark">
              {stats.openSubmissions}
            </div>
          </div>
          <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Angenommen</div>
            <div className="mt-1 text-2xl font-bold text-gold">
              {stats.acceptedSubmissions}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Nächste Deadlines */}
          <section className="rounded-2xl bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Nächste Deadlines
            </h2>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/wettbewerb/${comp.id}`}
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
                          ? formatDateShort(comp.deadline)
                          : 'TBD'}
                      </p>
                      <Badge variant="default" className="mt-1">
                        {TYPE_LABELS[comp.type] || comp.type}
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
          <section className="rounded-2xl bg-light-surface p-6 dark:bg-dark-surface">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Neue Funde
            </h2>

            {latestCompetitions.length > 0 ? (
              <div className="space-y-3">
                {latestCompetitions.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/wettbewerb/${comp.id}`}
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
                      {TYPE_LABELS[comp.type] || comp.type}
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
        {/* AI Recommendations */}
        <div className="mt-8">
          <AiRecommendations />
        </div>
      </div>
    </main>
  )
}
