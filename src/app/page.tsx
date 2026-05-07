export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDateShort, TYPE_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AiMessage, AiRecommendations } from '@/components/dashboard/AiMessage'
import { excludeMagazineRoots } from '@/server/lib/competition-filters'

interface CompetitionDisplay {
  id: string
  name: string
  deadline: Date | null
  type: string
  organizer?: string | null
}

async function getStats() {
  // Submissions: groupBy reduces 3 separate counts to 1 query.
  // Competition counts have different where-clauses, so they stay separate but parallel.
  const [activeCount, starredCount, submissionGroups] = await Promise.all([
    db.competition.count({ where: { status: 'ACTIVE', dismissed: false, ...excludeMagazineRoots } }),
    db.competition.count({ where: { starred: true, dismissed: false, ...excludeMagazineRoots } }),
    db.submission.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const totalSubmissions = submissionGroups.reduce((sum, g) => sum + g._count._all, 0)
  const acceptedSubmissions = submissionGroups.find(g => g.status === 'ACCEPTED')?._count._all ?? 0
  const openSubmissions = submissionGroups.find(g => g.status === 'SUBMITTED')?._count._all ?? 0

  return {
    totalCompetitions: activeCount,
    starredCount,
    totalSubmissions,
    acceptedSubmissions,
    openSubmissions,
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

function StatCard({ label, value, gold = false }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
      <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${gold ? 'text-gold' : 'text-accent-light dark:text-accent-dark'}`}>
        {value}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-lg bg-light-surface p-4 dark:bg-dark-surface">
          <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

async function StatsSection() {
  const stats = await getStats()
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
      <StatCard label="Ausschreibungen" value={stats.totalCompetitions} />
      <StatCard label="Geplant" value={stats.starredCount} />
      <StatCard label="Eingereicht" value={stats.totalSubmissions} />
      <StatCard label="Offen" value={stats.openSubmissions} />
      <StatCard label="Angenommen" value={stats.acceptedSubmissions} gold />
    </div>
  )
}

function ListSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-2xl bg-light-surface p-6 dark:bg-dark-surface">
      <h2 className="mb-4 text-xl font-semibold text-black dark:text-white">{title}</h2>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </section>
  )
}

async function UpcomingDeadlinesSection() {
  const upcomingDeadlines = await getUpcomingDeadlines()
  return (
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
                  {comp.deadline ? formatDateShort(comp.deadline) : 'TBD'}
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
  )
}

async function LatestCompetitionsSection() {
  const latestCompetitions = await getLatestCompetitions()
  return (
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
  )
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* AI Recommendation Banner — client component, renders immediately */}
        <AiMessage />

        {/* Stats Bar — streams in */}
        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Main Content Grid — each list streams independently */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Suspense fallback={<ListSkeleton title="Nächste Deadlines" />}>
            <UpcomingDeadlinesSection />
          </Suspense>
          <Suspense fallback={<ListSkeleton title="Neue Funde" />}>
            <LatestCompetitionsSection />
          </Suspense>
        </div>

        {/* AI Recommendations — client component */}
        <div className="mt-8">
          <AiRecommendations />
        </div>
      </div>
    </main>
  )
}
