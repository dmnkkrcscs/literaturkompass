import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Parse notes like "Titel: X | Thema: Y | Publikation: Z"
function parseNotes(notes: string | null): { titel?: string; thema?: string; publikation?: string } {
  if (!notes) return {}
  const result: Record<string, string> = {}
  notes.split('|').forEach((part) => {
    const colonIdx = part.indexOf(':')
    if (colonIdx === -1) return
    const key = part.slice(0, colonIdx).trim().toLowerCase()
    const value = part.slice(colonIdx + 1).trim()
    if (key === 'titel') result.titel = value
    else if (key === 'thema') result.thema = value
    else if (key === 'publikation') result.publikation = value
  })
  return result
}

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ recommendations: [], reason: 'no_api_key' })
    }

    // Build user profile from submission history
    const submissions = await db.submission.findMany({
      include: {
        competition: {
          select: { theme: true, genres: true, type: true, name: true },
        },
      },
    })

    if (submissions.length === 0) {
      return NextResponse.json({ recommendations: [], reason: 'no_submissions' })
    }

    // Collect genres from competitions + parse themes from notes
    const allGenres = submissions.flatMap((s) => s.competition.genres)
    const genreCounts = allGenres.reduce(
      (acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc },
      {} as Record<string, number>
    )
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([g]) => g)

    const themes = submissions
      .map((s) => parseNotes(s.notes).thema || s.competition.theme)
      .filter(Boolean) as string[]

    const accepted = submissions.filter((s) => s.status === 'ACCEPTED').length

    const userProfile = {
      topGenres: topGenres.length ? topGenres : ['Kurzgeschichte', 'Prosa'],
      preferredThemes: [...new Set(themes)].slice(0, 6),
      avgTextLength: 8000,
      successfulPatterns:
        accepted > 0 ? submissions.filter((s) => s.status === 'ACCEPTED').map((s) => s.competition.name) : [],
      submissionCount: submissions.length,
      successRate: submissions.length > 0 ? Number(accepted) / Number(submissions.length) : 0,
    }

    // Get competitions not yet in the user's plan
    const plannedIds = submissions.map((s) => s.competitionId)
    const competitions = await db.competition.findMany({
      where: {
        id: { notIn: plannedIds },
        status: 'ACTIVE',
        dismissed: false,
      },
      take: 20,
      orderBy: [{ deadline: 'asc' }],
    })

    if (competitions.length === 0) {
      return NextResponse.json({ recommendations: [], reason: 'no_competitions' })
    }

    // Lazy-import to avoid loading Anthropic SDK at cold start if key is missing
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

    // Enrich with full competition data
    const enriched = recs
      .slice(0, 3)
      .map((rec) => {
        const comp = competitions.find((c) => c.id === rec.competitionId)
        return comp ? { ...rec, competition: comp } : null
      })
      .filter(Boolean)

    return NextResponse.json({ recommendations: enriched, userProfile })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json({ recommendations: [], reason: 'error', error: String(error) })
  }
}
