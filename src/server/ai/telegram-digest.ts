import { anthropic } from './client'
import { db } from '@/lib/db'

const TELEGRAM_DIGEST_SYSTEM_PROMPT = `Du bist der Literaturkompass – ein literaturbegeisterter Assistent, der täglich per Telegram eine kurze Nachricht sendet.

Regeln:
- Schreibe auf Deutsch, persönlich und variiert
- Wechsle den Ton: mal motivierend, mal analytisch, mal spielerisch, mal poetisch, mal lakonisch
- Beginne nie zweimal gleich – sei kreativ beim Einstieg
- Referenziere konkrete Wettbewerbsnamen und Deadlines
- Halte dich knapp: maximal 600 Zeichen
- Verwende HTML-Tags für Formatierung: <b>fett</b>, <i>kursiv</i>
- Kein Markdown, kein JSON
- Deadline-Erinnerungen sind BESONDERS WICHTIG — hebe sie hervor!
- Wenn es nichts Neues gibt, schreibe trotzdem etwas Ermutigendes zum Schreiben

Antworte NUR mit dem Nachrichtentext.`

export async function generateTelegramDigest(): Promise<string> {
  try {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [urgentDeadlines, upcomingDeadlines, newCompetitions, openCount, acceptedCount] = await Promise.all([
      // Deadlines in the next 7 days (URGENT)
      db.competition.findMany({
        where: {
          starred: true,
          dismissed: false,
          deadline: { gt: now, lte: in7Days },
        },
        select: { name: true, deadline: true, theme: true },
        orderBy: { deadline: 'asc' },
      }),
      // Deadlines in the next 30 days
      db.competition.findMany({
        where: {
          starred: true,
          dismissed: false,
          deadline: { gt: in7Days, lte: in30Days },
        },
        select: { name: true, deadline: true, theme: true },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      // New competitions found yesterday
      db.competition.findMany({
        where: {
          createdAt: { gte: yesterday },
          dismissed: false,
          status: 'ACTIVE',
        },
        select: { name: true, type: true, deadline: true },
        take: 5,
      }),
      db.submission.count({ where: { status: 'SUBMITTED' } }),
      db.submission.count({ where: { status: 'ACCEPTED' } }),
    ])

    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(d)

    let context = `Heute: ${formatDate(now)}\n`

    if (urgentDeadlines.length > 0) {
      context += `\n⚠️ DRINGENDE Deadlines (nächste 7 Tage):\n`
      for (const c of urgentDeadlines) {
        const days = Math.ceil((c.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        context += `- "${c.name}" in ${days} Tag(en)${c.theme ? ` – Thema: ${c.theme}` : ''}\n`
      }
    }

    if (upcomingDeadlines.length > 0) {
      context += `\nKommende Deadlines (nächste 30 Tage):\n`
      for (const c of upcomingDeadlines) {
        context += `- "${c.name}" am ${formatDate(c.deadline!)}${c.theme ? ` – ${c.theme}` : ''}\n`
      }
    }

    if (newCompetitions.length > 0) {
      context += `\n${newCompetitions.length} neue Ausschreibung(en):\n`
      for (const c of newCompetitions) {
        context += `- "${c.name}"${c.deadline ? ` (Deadline: ${formatDate(c.deadline)})` : ''}\n`
      }
    }

    if (openCount > 0) {
      context += `\n${openCount} Einreichung(en) warten auf Antwort.\n`
    }
    if (acceptedCount > 0) {
      context += `Bisherige Zusagen: ${acceptedCount}\n`
    }

    if (urgentDeadlines.length === 0 && upcomingDeadlines.length === 0 && newCompetitions.length === 0) {
      context += '\nKeine dringenden Deadlines, keine neuen Funde heute.\n'
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
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
