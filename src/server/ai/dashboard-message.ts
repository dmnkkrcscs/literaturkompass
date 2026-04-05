import { anthropic } from './client'
import { db } from '@/lib/db'

const DASHBOARD_SYSTEM_PROMPT = `Du bist der Literaturkompass – ein warmherziger, begeisterter Literatur-Assistent. Deine Aufgabe ist es, dem Autor eine kurze, motivierende Nachricht zu schreiben.

Regeln:
- Schreibe auf Deutsch, persönlich und ermutigend
- Variiere deinen Ton: mal enthusiastisch, mal nachdenklich, mal humorvoll, mal poetisch
- Referenziere konkrete Wettbewerbsnamen und Deadlines aus dem Kontext
- Halte dich kurz: 2-4 Sätze
- Verwende keine Emojis
- Beginne nie mit "Hey" oder "Hallo" – sei kreativer
- Wenn Deadlines nahen, erwähne sie mit sanftem Druck
- Wenn neue Wettbewerbe gefunden wurden, mache neugierig
- Wenn es gerade nichts Neues gibt, ermutige zum Schreiben

Antworte NUR mit dem Nachrichtentext, kein JSON, keine Formatierung.`

export async function generateDashboardMessage(): Promise<string> {
  try {
    // Gather context
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const [upcomingStarred, newCompetitions, recentAccepted, openSubmissions] = await Promise.all([
      db.competition.findMany({
        where: {
          starred: true,
          dismissed: false,
          deadline: { gt: now, lte: in7Days },
        },
        select: { name: true, deadline: true, theme: true },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      db.competition.findMany({
        where: {
          createdAt: { gte: yesterday },
          dismissed: false,
          status: 'ACTIVE',
        },
        select: { name: true, type: true, theme: true, deadline: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.submission.count({ where: { status: 'ACCEPTED' } }),
      db.submission.count({ where: { status: 'SUBMITTED' } }),
    ])

    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(d)

    let context = `Heute ist ${formatDate(now)}.\n\n`

    if (upcomingStarred.length > 0) {
      context += `Geplante Einreichungen mit nahenden Deadlines:\n`
      for (const c of upcomingStarred) {
        const days = Math.ceil((c.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        context += `- "${c.name}" (Deadline: ${formatDate(c.deadline!)}, noch ${days} Tage)${c.theme ? ` – Thema: ${c.theme}` : ''}\n`
      }
      context += '\n'
    }

    if (newCompetitions.length > 0) {
      context += `Neue Ausschreibungen der letzten 48 Stunden:\n`
      for (const c of newCompetitions) {
        context += `- "${c.name}"${c.theme ? ` – ${c.theme}` : ''}${c.deadline ? ` (Deadline: ${formatDate(c.deadline)})` : ''}\n`
      }
      context += '\n'
    }

    if (openSubmissions > 0) {
      context += `${openSubmissions} offene Einreichung(en) warten auf Antwort.\n`
    }
    if (recentAccepted > 0) {
      context += `Bisherige Zusagen: ${recentAccepted}\n`
    }

    if (upcomingStarred.length === 0 && newCompetitions.length === 0) {
      context += 'Gerade gibt es keine dringenden Deadlines und keine neuen Funde. Ein guter Moment zum Schreiben!\n'
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: DASHBOARD_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    })

    const text = response.content.find((b) => b.type === 'text')
    return text?.type === 'text' ? text.text.trim() : 'Schreib weiter – jede Zeile zählt.'
  } catch (error) {
    console.error('Failed to generate dashboard message:', error)
    return 'Schreib weiter – jede Zeile zählt.'
  }
}
