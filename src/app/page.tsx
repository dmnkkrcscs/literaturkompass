export const dynamic = 'force-dynamic'

import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { db } from '@/lib/db'
import { BookOpen, TrendingUp, CheckCircle, Clock, Sparkles, ArrowRight, Bookmark } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompetitionDisplay {
  id: string
  name: string
  deadline: Date | null
  type: string
  organizer?: string | null
}

interface Recommendation {
  competitionId: string
  score: number
  reason: string
  competition?: CompetitionDisplay & { theme?: string | null; url?: string }
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getStats() {
  const [competitions, submissions, accepted] = await Promise.all([
    db.competition.count({ where: { status: 'ACTIVE', dismissed: false } }),
    db.submission.count(),
    db.submission.count({ where: { status: 'ACCEPTED' } }),
  ])
  return { competitions, submissions, accepted }
}

async function getUpcomingDeadlines(): Promise<CompetitionDisplay[]> {
  return db.competition.findMany({
    where: { deadline: { gt: new Date() }, status: 'ACTIVE', dismissed: false },
    select: { id: true, name: true, deadline: true, type: true, organizer: true },
    orderBy: { deadline: 'asc' },
    take: 6,
  })
}

async function getLatestCompetitions(): Promise<CompetitionDisplay[]> {
  return db.competition.findMany({
    where: { status: 'ACTIVE', dismissed: false },
    select: { id: true, name: true, deadline: true, type: true, organizer: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
}

async function getRecommendationsServer(): Promise<Recommendation[]> {
  if (!process.env.ANTHROPIC_API_KEY) return []
  try {
    const submissions = await db.submission.findMany({
      include: { competition: { select: { theme: true, genres: true, type: true, name: true } } },
    })
    if (submissions.length === 0) return []

    const allGenres = submissions.flatMap((s) => s.competition.genres)
    const genreCounts = allGenres.reduce((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc }, {} as Record<string, number>)
    const topGenres = Object.entries(genreCounts).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([g]) => g)
    const accepted = submissions.filter((s) => s.status === 'ACCEPTED').length

    const userProfile = {
      topGenres: topGenres.length ? topGenres : ['Kurzgeschichte', 'Prosa'],
      preferredThemes: submissions.map((s) => s.competition.theme).filter(Boolean) as string[],
      avgTextLength: 8000,
      successfulPatterns: accepted > 0 ? ['kreative Kurzprosa'] : [],
      submissionCount: submissions.length,
      successRate: Number(accepted) / Number(submissions.length),
    }

    const plannedIds = submissions.map((s) => s.competitionId)
    const competitions = await db.competition.findMany({
      where: { id: { notIn: plannedIds }, status: 'ACTIVE', dismissed: false },
      take: 15,
      orderBy: { createdAt: 'desc' },
    })

    if (!competitions.length) return []

    const { getRecommendations } = await import('@/server/ai/recommend')
    const recs = await getRecommendations(
      competitions.map((c) => ({
        id: c.id,
        name: c.name,
        theme: c.theme ?? undefined,
        genres: c.genres,
        maxLength: undefined,
        description: c.description ?? undefined,
      })),
      userProfile
    )

    return recs
      .slice(0, 3)
      .map((rec) => {
        const comp = competitions.find((c) => c.id === rec.competitionId)
        return comp ? { ...rec, competition: comp } : null
      })
      .filter(Boolean) as Recommendation[]
  } catch (e) {
    console.error('Recommendations failed:', e)
    return []
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const typeColors: Record<string, { dot: string; badge: string; text: string }> = {
  WETTBEWERB: { dot: 'bg-wine', badge: 'bg-wine/10 text-wine dark:bg-wine/20 dark:text-wine-light', text: 'Wettbewerb' },
  ANTHOLOGIE: { dot: 'bg-sage', badge: 'bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage-light', text: 'Anthologie' },
  ZEITSCHRIFT: { dot: 'bg-gold', badge: 'bg-gold/10 text-yellow-700 dark:bg-gold/20 dark:text-gold-light', text: 'Zeitschrift' },
}

function DeadlinePill({ deadline }: { deadline: Date }) {
  const days = differenceInDays(deadline, new Date())
  if (days < 0) return <span className="font-mono text-xs text-gray-400 line-through">{format(deadline, 'dd. MMM', { locale: de })}</span>
  if (days <= 7) return <span className="font-mono text-xs font-bold text-red-500 animate-pulse">{days}d</span>
  if (days <= 30) return <span className="font-mono text-xs font-semibold text-orange-500">{days}d</span>
  return <span className="font-mono text-xs text-gray-400">{format(deadline, 'dd. MMM', { locale: de })}</span>
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, deadlines, latest, recs] = await Promise.all([
    getStats(),
    getUpcomingDeadlines(),
    getLatestCompetitions(),
    getRecommendationsServer(),
  ])

  return (
    <main className="min-h-screen bg-lit-bg dark:bg-dark-bg">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Hero heading ── */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
            Dein persönlicher Kompass
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Literaturkompass
          </h1>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Ausschreibungen', value: stats.competitions, sub: 'aktiv', icon: BookOpen, color: 'wine' },
            { label: 'Einreichungen', value: stats.submissions, sub: 'eingereicht', icon: TrendingUp, color: 'sage' },
            { label: 'Angenommen', value: stats.accepted, sub: 'akzeptiert', icon: CheckCircle, color: 'gold' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div
              key={label}
              className={`rounded-2xl bg-white dark:bg-dark-surface p-5 shadow-sm border-t-[3px] border-t-${color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
                </div>
                <Icon className={`h-5 w-5 text-${color} opacity-60 mt-0.5`} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-col layout ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">

          {/* Nächste Deadlines */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-wine" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Nächste Deadlines</h2>
              </div>
              <Link href="/entdecken" className="text-xs text-accent-light dark:text-accent-light hover:underline flex items-center gap-0.5">
                alle <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {deadlines.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center text-gray-400 dark:text-gray-500">
                  Keine bevorstehenden Deadlines
                </p>
              ) : deadlines.map((comp) => {
                const tc = typeColors[comp.type]
                return (
                  <Link
                    key={comp.id}
                    href="/entdecken"
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tc?.dot || 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{comp.name}</p>
                      {comp.organizer && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{comp.organizer}</p>
                      )}
                    </div>
                    {comp.deadline && <DeadlinePill deadline={comp.deadline} />}
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Neue Funde */}
          <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-light dark:text-accent-light" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Neue Funde</h2>
              </div>
              <Link href="/entdecken" className="text-xs text-accent-light dark:text-accent-light hover:underline flex items-center gap-0.5">
                alle <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {latest.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center text-gray-400 dark:text-gray-500">
                  Keine neuen Einträge
                </p>
              ) : latest.map((comp) => {
                const tc = typeColors[comp.type]
                return (
                  <Link
                    key={comp.id}
                    href="/entdecken"
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tc?.dot || 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{comp.name}</p>
                      {comp.organizer && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{comp.organizer}</p>
                      )}
                    </div>
                    {tc && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${tc.badge}`}>
                        {tc.text}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        {/* ── KI-Empfehlungen ── */}
        <section className="rounded-2xl bg-white dark:bg-dark-surface shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <Sparkles className="h-4 w-4 text-accent-light dark:text-accent-light" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">KI-Empfehlungen</h2>
            {recs.length > 0 && (
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                basierend auf deinem Profil
              </span>
            )}
          </div>

          {recs.length === 0 ? (
            <div className="px-6 py-10 text-center">
              {!process.env.ANTHROPIC_API_KEY ? (
                <>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Kein API-Key konfiguriert</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Trage ANTHROPIC_API_KEY in Coolify ein um Empfehlungen zu aktivieren.
                  </p>
                </>
              ) : (
                <>
                  <Bookmark className="mx-auto h-8 w-8 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Noch keine Empfehlungen</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Reiche bei ein paar Wettbewerben ein — dann lerne ich deine Präferenzen kennen.
                  </p>
                  <Link
                    href="/entdecken"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent-light dark:text-accent-light hover:underline"
                  >
                    Ausschreibungen entdecken <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {recs.map((rec) => {
                if (!rec.competition) return null
                const tc = typeColors[rec.competition.type]
                const pct = Math.round(rec.score ?? 0)
                return (
                  <div key={rec.competitionId} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {/* Score ring */}
                      <div className="shrink-0 flex flex-col items-center">
                        <span className="font-mono text-lg font-bold text-accent-light dark:text-accent-light">
                          {pct}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {tc && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tc.badge}`}>
                              {tc.text}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
                          {rec.competition.name}
                        </p>
                        {rec.reasoning && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                            {rec.reasoning}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/entdecken"
                        className="shrink-0 mt-0.5 text-xs text-accent-light dark:text-accent-light hover:underline"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
