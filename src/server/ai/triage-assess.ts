import { anthropic } from './client'
import { db } from '@/lib/db'

export interface TriageAssessment {
  score: number | null   // 1–100, null = kein Profil vorhanden
  reason: string | null  // 1 Satz Begründung
}

/** Baut ein kurzes Autorenprofil aus der DB-Historie */
async function buildProfile(): Promise<string | null> {
  const [accepted, submissions, starred, dismissed, texts] = await Promise.all([
    db.submission.findMany({
      where: { status: 'ACCEPTED' },
      include: { competition: { select: { name: true, type: true, theme: true, genres: true } } },
      take: 10,
    }),
    // Ablehnungen werden bewusst ausgeschlossen — sie sind subjektiv (Jury-Geschmack,
    // Glück, Themenpassung) und sagen nichts über die Eignung des Autors aus.
    db.submission.findMany({
      where: { status: { not: 'REJECTED' } },
      include: { competition: { select: { type: true, genres: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.competition.findMany({
      where: { starred: true },
      select: { theme: true, genres: true },
      take: 20,
    }),
    db.userFeedback.findMany({
      where: { action: 'DISMISSED', reason: { not: null } },
      select: { reason: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.submission.findMany({
      where: { textContent: { not: null }, status: { not: 'REJECTED' } },
      select: { title: true, textContent: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  // Brauche irgendwas, um ein Profil zu bauen
  if (accepted.length === 0 && submissions.length === 0 && starred.length === 0) {
    return null
  }

  const allGenres = [
    ...starred.flatMap(c => c.genres),
    ...submissions.map(s => s.competition).flatMap(c => c.genres),
  ]
  const genreCounts = allGenres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {} as Record<string, number>)
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([g]) => g)

  const lines: string[] = []
  if (accepted.length > 0) {
    lines.push(`Angenommen bei: ${accepted.map(a => `"${a.competition.name}" (${a.competition.theme || a.competition.type})`).join(', ')}`)
  }
  if (topGenres.length > 0) {
    lines.push(`Bevorzugte Genres: ${topGenres.join(', ')}`)
  }
  const interestingThemes = starred.map(s => s.theme).filter(Boolean).slice(0, 5).join(', ')
  if (interestingThemes) {
    lines.push(`Interessante Themen bisher: ${interestingThemes}`)
  }
  if (dismissed.length > 0) {
    // Triage-Verwerfungen (z.B. "Falsches Genre") — KEINE Verlags-Ablehnungen.
    lines.push(`Bei Sichtung verworfen wegen: ${dismissed.map(d => d.reason).filter(Boolean).join(', ')}`)
  }

  if (texts.length > 0) {
    lines.push('\nTextproben (Auszüge):')
    for (const t of texts) {
      lines.push(`"${t.title || 'Ohne Titel'}": ${(t.textContent || '').substring(0, 300)}`)
    }
  }

  return lines.join('\n')
}

export async function assessForTriage(competitionId: string): Promise<TriageAssessment> {
  const [competition, profile] = await Promise.all([
    db.competition.findUnique({
      where: { id: competitionId },
      select: {
        name: true,
        type: true,
        theme: true,
        genres: true,
        description: true,
        prize: true,
        deadline: true,
        maxLength: true,
        ageRestriction: true,
        regionRestriction: true,
        fee: true,
      },
    }),
    buildProfile(),
  ])

  if (!competition) return { score: null, reason: null }
  if (!profile) {
    // Kein Profil → neutrale Einschätzung ohne Personalisierung
    return { score: null, reason: 'Noch kein Profil — reiche erst etwas ein, damit die KI dich besser kennt.' }
  }

  const competitionText = [
    `Name: ${competition.name}`,
    `Typ: ${competition.type}`,
    competition.theme ? `Thema: ${competition.theme}` : null,
    competition.genres.length > 0 ? `Genres: ${competition.genres.join(', ')}` : null,
    competition.prize ? `Preis: ${competition.prize}` : null,
    competition.deadline ? `Deadline: ${competition.deadline.toISOString().split('T')[0]}` : null,
    competition.maxLength ? `Max. Länge: ${competition.maxLength}` : null,
    competition.ageRestriction ? `Altersbeschränkung: ${competition.ageRestriction}` : null,
    competition.regionRestriction ? `Regionalbeschränkung: ${competition.regionRestriction}` : null,
    competition.fee ? `Gebühr: ${competition.fee}` : null,
    competition.description ? `Beschreibung: ${competition.description.substring(0, 300)}` : null,
  ].filter(Boolean).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Du bist ein Literaturberater. Bewerte diesen Wettbewerb für einen Autor mit folgendem Profil.

AUTORENPROFIL:
${profile}

WETTBEWERB:
${competitionText}

Antworte NUR als JSON (kein Markdown, kein Text darum):
{"score": 72, "reason": "Ein Satz auf Deutsch warum es passt oder nicht."}

Score 1–100: 100 = perfekte Passung, 1 = überhaupt nicht passend.

WICHTIG: Bewerte nur die inhaltliche/thematische/stilistische Passung. Spekuliere
nicht über Erfolgswahrscheinlichkeit, Qualität des Autors oder Ablehnungsquoten.`,
      },
    ],
  })

  const text = response.content.find(b => b.type === 'text')
  if (!text || text.type !== 'text') return { score: null, reason: null }

  const jsonMatch = text.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { score: null, reason: null }

  const parsed = JSON.parse(jsonMatch[0]) as { score: number; reason: string }
  return {
    score: Math.min(100, Math.max(1, Math.round(parsed.score))),
    reason: parsed.reason,
  }
}
