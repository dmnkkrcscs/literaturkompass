import { anthropic } from './client'
import { db } from '@/lib/db'
import { excludeMagazineRoots } from '@/server/lib/competition-filters'

export interface AiRecommendation {
  competitionId: string
  name: string
  deadline: string | null
  type: string
  theme: string | null
  score: number // 1-100
  reason: string // Warum es passt
  url: string
}

const RECOMMENDATION_PROMPT = `Du bist ein Literaturberater. Bewerte die folgenden Wettbewerbe/Zeitschriften für einen deutschsprachigen Autor, der literarische Texte schreibt.

Über den Autor:
{profile}

Bewerte jeden Wettbewerb auf einer Skala von 1–100 (Passung zum Autorenprofil) und gib einen kurzen Grund an (1 Satz, deutsch).

Antworte als JSON-Array:
[{"id": "...", "score": 85, "reason": "Dein Stil passt perfekt zum Thema..."}]

NUR das JSON-Array, keine andere Formatierung.`

export async function generateRecommendations(): Promise<AiRecommendation[]> {
  try {
    // Build user profile from submission history
    const [submissions, accepted, feedback, starred, textsWithContent, competitions] = await Promise.all([
      db.submission.findMany({
        include: { competition: { select: { name: true, type: true, theme: true, genres: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.submission.findMany({
        where: { status: 'ACCEPTED' },
        include: { competition: { select: { name: true, type: true, theme: true, genres: true, organizer: true } } },
      }),
      db.userFeedback.findMany({
        where: { action: 'DISMISSED' },
        include: { competition: { select: { name: true, type: true, theme: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.competition.findMany({
        where: { starred: true, dismissed: false },
        select: { name: true, type: true, theme: true, genres: true },
      }),
      db.submission.findMany({
        where: { textContent: { not: null } },
        select: { textContent: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.competition.findMany({
        where: {
          dismissed: false,
          starred: false,
          status: 'ACTIVE',
          deadline: { gt: new Date() },
          submissions: { none: { status: { in: ['SUBMITTED', 'ACCEPTED'] } } },
          ...excludeMagazineRoots,
        },
        select: {
          id: true, name: true, type: true, theme: true, genres: true,
          description: true, deadline: true, maxLength: true, prize: true, url: true,
        },
        orderBy: { deadline: 'asc' },
        take: 15,
      }),
    ])

    // Build profile text
    const acceptedNames = accepted.map(a => `"${a.competition.name}" (${a.competition.theme || 'ohne Thema'})`).join(', ')
    const starredThemes = starred.map(s => s.theme).filter(Boolean).join(', ')
    const allGenres = [...starred, ...submissions.map(s => s.competition)].flatMap(c => c.genres)
    const genreCounts = allGenres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {} as Record<string, number>)
    const topGenres = Object.entries(genreCounts).sort((a, b) => (b[1] as number) - (a[1] as number))
    const dismissedReasons = feedback.map(f => f.reason).filter(Boolean).join(', ')

    let profile = ''
    if (accepted.length > 0) profile += `Angenommen bei: ${acceptedNames}\n`
    if (topGenres.length > 0) profile += `Bevorzugte Genres: ${topGenres.join(', ')}\n`
    if (starredThemes) profile += `Interessante Themen: ${starredThemes}\n`
    profile += `Einreichungen gesamt: ${submissions.length}, Zusagen: ${accepted.length}\n`
    if (dismissedReasons) profile += `Nicht interessiert an: ${dismissedReasons}\n`

    // Add writing style analysis from submitted texts
    if (textsWithContent.length > 0) {
      profile += `\nTextproben des Autors:\n`
      for (const t of textsWithContent) {
        const snippet = (t.textContent || '').substring(0, 500)
        profile += `--- "${t.title || 'Ohne Titel'}" (Auszug) ---\n${snippet}\n\n`
      }
    }

    if (!profile) profile = 'Neuer Autor, noch keine Einreichungen. Empfehle vielfältige, zugängliche Wettbewerbe.\n'

    if (competitions.length === 0) {
      return []
    }

    const competitionsText = competitions.map(c =>
      `ID: ${c.id} | ${c.name} | Thema: ${c.theme || '-'} | Genres: ${c.genres.join(', ') || '-'} | Deadline: ${c.deadline?.toISOString().split('T')[0] || '-'} | Preis: ${c.prize || '-'} | ${c.description?.substring(0, 100) || ''}`
    ).join('\n')

    const prompt = RECOMMENDATION_PROMPT.replace('{profile}', profile)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nWettbewerbe:\n${competitionsText}`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return []

    // Parse JSON from response
    const jsonMatch = text.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const scores: Array<{ id: string; score: number; reason: string }> = JSON.parse(jsonMatch[0])

    // Merge with competition data
    const recommendations: AiRecommendation[] = scores
      .map(s => {
        const comp = competitions.find(c => c.id === s.id)
        if (!comp) return null
        return {
          competitionId: comp.id,
          name: comp.name,
          deadline: comp.deadline?.toISOString().split('T')[0] || null,
          type: comp.type,
          theme: comp.theme,
          score: Math.min(100, Math.max(1, s.score)),
          reason: s.reason,
          url: comp.url,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return recommendations
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
    return []
  }
}
