import { anthropic } from './client'
import { db } from '@/lib/db'
import { formatDateDE, daysUntil } from '@/lib/utils'

const DASHBOARD_SYSTEM_PROMPT = `Du bist der Literaturkompass – ein smarter, sachlicher Literatur-Assistent. Du gibst dem Autor einen kurzen, informativen Lagebericht.

Regeln:
- Schreibe auf Deutsch, direkt und informativ – KEIN Lob, KEINE Motivation, NICHT "toll gemacht"
- Fokus auf KONKRETE INFOS: nahende Deadlines mit Tagen, neue Funde, offene Einreichungen
- Wenn Deadlines nahen: nenne Name + verbleibende Tage klar und direkt
- Wenn neue Wettbewerbe gefunden wurden: nenne sie beim Namen, sag kurz worum es geht
- Wenn es passende Wettbewerbe gibt: heb hervor warum sie passen könnten (Thema, Genre)
- Halte dich kurz: 2-4 Sätze, maximal 5
- Verwende keine Emojis
- Beginne nie mit "Hey", "Hallo" oder Lob – starte direkt mit der wichtigsten Info
- Ton: wie ein knapper Briefing eines persönlichen Assistenten

Antworte NUR mit dem Nachrichtentext, kein JSON, keine Formatierung.`

export async function generateDashboardMessage(): Promise<string> {
  try {
    // Gather context
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const [urgentDeadlines, upcomingDeadlines, newCompetitions, openSubmissions, textsCount, totalActive] = await Promise.all([
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
          starred: true,
          dismissed: false,
          deadline: { gt: in7Days, lte: in30Days },
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
      db.submission.count({ where: { status: 'SUBMITTED' } }),
      db.submission.count({ where: { textContent: { not: null } } }),
      db.competition.count({ where: { status: 'ACTIVE', dismissed: false, deadline: { gt: now } } }),
    ])

    let context = `Heute ist ${formatDateDE(now)}.\n\n`

    if (urgentDeadlines.length > 0) {
      context += `DRINGEND – Deadlines diese Woche:\n`
      for (const c of urgentDeadlines) {
        const days = daysUntil(c.deadline!)
        context += `- "${c.name}" (noch ${days} Tag${days !== 1 ? 'e' : ''})${c.theme ? ` – Thema: ${c.theme}` : ''}\n`
      }
      context += '\n'
    }

    if (upcomingDeadlines.length > 0) {
      context += `Kommende Deadlines (nächste 30 Tage):\n`
      for (const c of upcomingDeadlines) {
        const days = daysUntil(c.deadline!)
        context += `- "${c.name}" (noch ${days} Tage)${c.theme ? ` – Thema: ${c.theme}` : ''}\n`
      }
      context += '\n'
    }

    if (newCompetitions.length > 0) {
      context += `Neue Ausschreibungen (letzte 48h):\n`
      for (const c of newCompetitions) {
        context += `- "${c.name}"${c.theme ? ` – ${c.theme}` : ''}${c.deadline ? ` (Deadline: ${formatDateDE(c.deadline)})` : ''}\n`
      }
      context += '\n'
    }

    context += `Status: ${openSubmissions} offene Einreichung${openSubmissions !== 1 ? 'en' : ''}, ${totalActive} aktive Wettbewerbe verfügbar.\n`
    if (textsCount > 0) {
      context += `${textsCount} eingereichte Texte sind hinterlegt und werden für personalisierte Empfehlungen analysiert.\n`
    }

    if (urgentDeadlines.length === 0 && newCompetitions.length === 0 && upcomingDeadlines.length === 0) {
      context += 'Keine dringenden Deadlines und keine neuen Funde. Ruhige Phase.\n'
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
