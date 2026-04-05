import { anthropic } from './client'
import { db } from '@/lib/db'

const TELEGRAM_DIGEST_SYSTEM_PROMPT = `Du bist der Literaturkompass – ein literaturbegeisterter Assistent, der täglich per Telegram eine kurze Nachricht sendet.

Regeln:
- Schreibe auf Deutsch, persönlich und variiert
- Wechsle den Ton: mal motivierend, mal analytisch, mal spielerisch, mal poetisch, mal lakonisch
- Beginne nie zweimal gleich – sei kreativ beim Einstieg
- Referenziere konkrete Wettbewerbsnamen und Deadlines
- Halte dich knapp: maximal 400 Zeichen
- Verwende HTML-Tags für Formatierung: <b>fett</b>, <i>kursiv</i>
- Kein Markdown, kein JSON
- Wenn es nichts Neues gibt, schreibe trotzdem etwas Ermutigendes zum Schreiben

Antworte NUR mit dem Nachrichtentext.`

export async function generateTelegramDigest(): Promise<string> {
  try {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [upcomingStarred, newCompetitions, openCount] = await Promise.all([
      db.competition.findMany({
        where: {
          starred: true,
          dismissed: false,
          deadline: { gt: now, lte: in7Days },
        },
        select: { name: true, deadline: true },
        orderBy: { deadline: 'asc' },
        take: 3,
      }),
      db.competition.findMany({
        where: {
          createdAt: { gte: yesterday },
          dismissed: false,
          status: 'ACTIVE',
        },
        select: { name: true, type: true, deadline: true },
        take: 3,
      }),
      db.submission.count({ where: { status: 'SUBMITTED' } }),
    ])

    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(d)

    let context = `Heute: ${formatDate(now)}\n`

    if (upcomingStarred.length > 0) {
      context += `\nNahende Deadlines:\n`
      for (const c of upcomingStarred) {
        const days = Math.ceil((c.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        context += `- "${c.name}" in ${days} Tag(en)\n`
      }
    }

    if (newCompetitions.length > 0) {
      context += `\n${newCompetitions.length} neue Ausschreibung(en):\n`
      for (const c of newCompetitions) {
        context += `- "${c.name}"\n`
      }
    }

    if (openCount > 0) {
      context += `\n${openCount} Einreichung(en) warten auf Antwort.\n`
    }

    if (upcomingStarred.length === 0 && newCompetitions.length === 0) {
      context += '\nKeine dringenden Deadlines, keine neuen Funde heute.\n'
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: TELEGRAM_DIGEST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    })

    const text = response.content.find((b) => b.type === 'text')
    return text?.type === 'text' ? text.text.trim() : 'Schreib heute eine Zeile. Nur eine.'
  } catch (error) {
    console.error('Failed to generate Telegram digest:', error)
    return 'Schreib heute eine Zeile. Nur eine.'
  }
}
