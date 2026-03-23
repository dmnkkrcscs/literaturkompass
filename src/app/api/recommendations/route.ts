import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function loadPreferences() {
  try {
    const { redis } = await import('@/lib/redis')
    const raw = await redis.get('user:preferences')
    if (raw) return JSON.parse(raw)
  } catch { /* Redis not available */ }
  return null
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ recommendations: [], reason: 'no_api_key' })
    }

    // Load submissions + starred/dismissed competitions + explicit preferences in parallel
    const [submissions, starredComps, prefs] = await Promise.all([
      db.submission.findMany({
        include: {
          competition: { select: { theme: true, genres: true, type: true, name: true } },
        },
      }),
      db.competition.findMany({
        where: { starred: true },
        select: { theme: true, genres: true, name: true },
      }),
      loadPreferences(),
    ])

    // Build genre profile from submissions + starred + explicit preferences
    const allGenres = [
      ...submissions.flatMap((s) => s.competition.genres),
      ...starredComps.flatMap((c) => c.genres),
      ...(prefs?.favoriteGenres ?? []),
    ]
    const genreCounts = allGenres.reduce(
      (acc: Record<string, number>, g: string) => { acc[g] = (acc[g] || 0) + 1; return acc },
      {}
    )
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6)
      .map(([g]) => g)

    // Build theme profile
    const themes = [
      ...submissions.map((s) => parseNotes(s.notes).thema || s.competition.theme).filter(Boolean),
      ...starredComps.map((c) => c.theme).filter(Boolean),
      ...(prefs?.favoriteThemes ?? []),
    ] as string[]

    const accepted = submissions.filter((s) => s.status === 'ACCEPTED').length

    // Successful patterns: names of accepted competitions + genres from starred
    const successfulPatterns = [
      ...submissions.filter((s) => s.status === 'ACCEPTED').map((s) => s.competition.name),
      ...starredComps.slice(0, 3).map((c) => c.name),
    ]

    // Bio from explicit preferences enriches the profile
    const bioAddition = prefs?.bio ? `\nPersönliche Interessen: ${prefs.bio}` : ''
    const locationAddition = prefs?.location ? `\nWohnort: ${prefs.location}` : ''
    const dislikedAddition = prefs?.dislikedTopics?.length
      ? `\nNicht interessant: ${prefs.dislikedTopics.join(', ')}`
      : ''

    const userProfile = {
      topGenres: topGenres.length ? topGenres : (prefs?.favoriteGenres?.length ? prefs.favoriteGenres : ['Kurzgeschichte', 'Prosa']),
      preferredThemes: [...new Set(themes)].slice(0, 8),
      avgTextLength: 8000,
      successfulPatterns: successfulPatterns.slice(0, 5),
      submissionCount: submissions.length,
      successRate: submissions.length > 0 ? Number(accepted) / Number(submissions.length) : 0,
      // Extra context injected as a note (picked up by the prompt template)
      note: `${bioAddition}${locationAddition}${dislikedAddition}`.trim(),
    }

    // Get competitions not yet in the user's plan, exclude dismissed
    const plannedIds = submissions.map((s) => s.competitionId)
    const competitions = await db.competition.findMany({
      where: {
        id: { notIn: plannedIds },
        status: 'ACTIVE',
        dismissed: false,
      },
      take: 25,
      orderBy: [{ deadline: 'asc' }, { starredAt: 'desc' }],
    })

    if (competitions.length === 0) {
      return NextResponse.json({ recommendations: [], reason: 'no_competitions' })
    }

    if (submissions.length === 0 && !prefs?.bio) {
      return NextResponse.json({ recommendations: [], reason: 'no_profile' })
    }

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
