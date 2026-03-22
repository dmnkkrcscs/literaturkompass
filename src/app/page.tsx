export const dynamic = 'force-dynamic'

import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, TrendingUp, CheckCircle, Clock, Sparkles, Calendar } from 'lucide-react'

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
    db.competition.count({ where: { status: 'ACTIVE', dismissed: false } }),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
  ])
  return { totalCompetitions: competitions, totalSubmissions: submissions, acceptedSubmissions: accepted }
}

async function getUpcomingDeadlines(): Promise<CompetitionDisplay[]> {
  const now = new Date()
  return db.competition.findMany({
    where: { deadline: { gt: now }, status: 'ACTIVE', dismissed: false },
    select: { id: true, name: true, deadline: true, type: true, organizer: true },
    orderBy: { deadline: 'asc' },
    take: 5,
  })
}

async function getLatestCompetitions(): Promise<CompetitionDisplay[]> {
  return db.competition.findMany({
    where: { status: 'ACTIVE', dismissed: false },
    select: { id: true, name: true, deadline: true, type: true, organizer: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
}

const typeConfig: Record<string, { label: string; variant: 'wine' | 'sage' | 'gold'; borderClass: string }> = {
  WETTBEWERB: { label: 'Wettbewerb', variant: 'wine', borderClass: 'border-l-wine' },
  ANTHOLOGIE: { label: 'Anthologie', variant: 'sage', borderClass: 'border-l-sage' },
  ZEITSCHRIFT: { label: 'Zeitschrift', variant: 'gold', borderClass: 'border-l-gold' },
}

function DeadlineDays({ deadline }: { deadline: Date }) {
  const days = differenceInDays(deadline, new Date())
  if (days < 0) return <span className="text-xs text-red-500 font-medium">Abgelaufen</span>
  if (days <= 7) return <span className="text-xs text-orange-500 font-medium">{days}d verbleibend</span>
  if (days <= 30) return <span className="text-xs text-yellow-500 font-medium">{days}d verbleibend</span>
  return <span className="text-xs text-gray-500 dark:text-gray-400">{format(deadline, 'dd. MMM yyyy', { locale: de })}</span>
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Dein persönlicher Kompass durch die Literaturwelt
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-light-surface dark:bg-dark-surface border-l-4 border-l-wine p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausschreibungen</p>
              <BookOpen className="h-5 w-5 text-wine" />
            </div>
            <p className="text-3xl font-bold text-black dark:text-white">{stats.totalCompetitions}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">aktiv & unveröffentlicht</p>
          </div>

          <div className="rounded-xl bg-light-surface dark:bg-dark-surface border-l-4 border-l-sage p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Einreichungen</p>
              <TrendingUp className="h-5 w-5 text-sage" />
            </div>
            <p className="text-3xl font-bold text-black dark:text-white">{stats.totalSubmissions}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">insgesamt eingereicht</p>
          </div>

          <div className="rounded-xl bg-light-surface dark:bg-dark-surface border-l-4 border-l-gold p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Angenommen</p>
              <CheckCircle className="h-5 w-5 text-gold" />
            </div>
            <p className="text-3xl font-bold text-black dark:text-white">{stats.acceptedSubmissions}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Einreichungen angenommen</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Nächste Deadlines */}
          <section className="rounded-xl bg-light-surface dark:bg-dark-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-5 w-5 text-accent-light dark:text-accent-dark" />
              <h2 className="text-lg font-semibold text-black dark:text-white">Nächste Deadlines</h2>
            </div>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-2">
                {upcomingDeadlines.map((comp) => {
                  const tc = typeConfig[comp.type]
                  return (
                    <Link
                      key={comp.id}
                      href={`/geplant/${comp.id}`}
                      className={`flex items-center justify-between rounded-lg border-l-2 ${tc?.borderClass || 'border-l-gray-300'} bg-gray-50 dark:bg-gray-800/50 px-4 py-3 transition-all hover:shadow-sm hover:bg-white dark:hover:bg-gray-800`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-black dark:text-white truncate">{comp.name}</p>
                        {comp.organizer && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{comp.organizer}</p>
                        )}
                      </div>
                      <div className="ml-3 text-right shrink-0">
                        {comp.deadline && <DeadlineDays deadline={comp.deadline} />}
                        {tc && <Badge variant={tc.variant} className="mt-1 block">{tc.label}</Badge>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500 py-4 text-center">
                Keine bevorstehenden Deadlines
              </p>
            )}

            <Link href="/entdecken" className="mt-5 block">
              <Button variant="secondary" className="w-full">Alle anzeigen</Button>
            </Link>
          </section>

          {/* Neue Funde */}
          <section className="rounded-xl bg-light-surface dark:bg-dark-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-5 w-5 text-accent-light dark:text-accent-dark" />
              <h2 className="text-lg font-semibold text-black dark:text-white">Neue Funde</h2>
            </div>

            {latestCompetitions.length > 0 ? (
              <div className="space-y-2">
                {latestCompetitions.map((comp) => {
                  const tc = typeConfig[comp.type]
                  return (
                    <Link
                      key={comp.id}
                      href={`/entdecken`}
                      className={`flex items-center justify-between rounded-lg border-l-2 ${tc?.borderClass || 'border-l-gray-300'} bg-gray-50 dark:bg-gray-800/50 px-4 py-3 transition-all hover:shadow-sm hover:bg-white dark:hover:bg-gray-800`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-black dark:text-white truncate">{comp.name}</p>
                        {comp.organizer && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{comp.organizer}</p>
                        )}
                      </div>
                      <div className="ml-3 shrink-0">
                        {tc && <Badge variant={tc.variant}>{tc.label}</Badge>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500 py-4 text-center">
                Keine neuen Funde
              </p>
            )}

            <Link href="/entdecken" className="mt-5 block">
              <Button variant="secondary" className="w-full">Alle entdecken</Button>
            </Link>
          </section>
        </div>

        {/* Empfehlungen Section */}
        <section className="mt-6 rounded-xl bg-light-surface dark:bg-dark-surface p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent-light dark:text-accent-dark" />
            <h2 className="text-lg font-semibold text-black dark:text-white">KI-Empfehlungen</h2>
            <Badge variant="accent" className="ml-auto">Demnächst</Badge>
          </div>
          <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Personalisierte Ausschreibungs-Empfehlungen basierend auf deinem Profil werden bald verfügbar sein.
            </p>
          </div>
        </section>

      </div>
    </main>
  )
}
