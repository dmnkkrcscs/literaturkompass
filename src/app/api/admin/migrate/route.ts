import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'
import type { CompType, SubStatus } from '@prisma/client'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'LitKompass2026!update'

const AGGREGATOR_SOURCES = [
  { name: 'Kreativ Schreiben Lernen', url: 'kreativ-schreiben-lernen.de' },
  { name: 'epubli', url: 'epubli.com' },
  { name: 'Treffpunkt Schreiben', url: 'treffpunktschreiben.at' },
  { name: 'Autorenwelt', url: 'autorenwelt.de' },
  { name: 'Wir erschaffen Welten', url: 'wir-erschaffen-welten.net' },
  { name: 'Literaturcafe', url: 'literaturcafe.de' },
  { name: 'Papierfresserchen', url: 'papierfresserchen.eu' },
  { name: 'Literaturport', url: 'literaturport.de' },
  { name: 'zugetextet', url: 'zugetextet.com' },
  { name: 'Federwelt', url: 'federwelt.de' },
  { name: 'Schreiblust Verlag', url: 'schreiblust-verlag.de' },
]

interface V1Competition {
  id: string; type: string; name: string; organizer?: string; deadline?: string
  theme?: string; genres?: string[]; prize?: string; maxLength?: string
  requirements?: string; ageRestriction?: string | null; regionRestriction?: string | null
  fee?: string | null; url: string; description?: string; source: string
}

interface V1Submission {
  id: string; name: string; title: string; theme: string; publication: string; date: string
}

function mapType(type: string): CompType {
  const m: Record<string, CompType> = { wettbewerb: 'WETTBEWERB', anthologie: 'ANTHOLOGIE', zeitschrift: 'ZEITSCHRIFT' }
  return m[type.toLowerCase()] ?? 'WETTBEWERB'
}

async function findOrCreateSource(sourceName: string) {
  const existing = await db.source.findUnique({ where: { url: sourceName } })
  if (existing) return existing
  return db.source.create({ data: { name: sourceName, url: sourceName, type: 'AGGREGATOR', isActive: true } })
}

async function findOrCreateCompetitionForSubmission(sub: V1Submission, sourceId: string) {
  // Try by legacyId first
  let comp = await db.competition.findUnique({ where: { legacyId: sub.id } })
  if (comp) return comp
  // Try by name
  comp = await db.competition.findFirst({ where: { name: sub.name } })
  if (comp) return comp
  // Create placeholder competition
  const placeholderUrl = `https://v1-import/${sub.id}`
  const existing = await db.competition.findUnique({ where: { url: placeholderUrl } })
  if (existing) return existing
  return db.competition.create({
    data: {
      legacyId: sub.id,
      name: sub.name,
      type: 'ZEITSCHRIFT',
      url: placeholderUrl,
      theme: sub.theme || null,
      sourceId,
      status: 'ACTIVE',
    }
  })
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const action = request.nextUrl.searchParams.get('action')

  // Seed standard aggregator sources
  if (action === 'seed-sources') {
    let created = 0, skipped = 0
    for (const s of AGGREGATOR_SOURCES) {
      const existing = await db.source.findUnique({ where: { url: s.url } })
      if (!existing) {
        await db.source.create({ data: { name: s.name, url: s.url, type: 'AGGREGATOR', isActive: true } })
        created++
      } else {
        if (!existing.isActive) await db.source.update({ where: { id: existing.id }, data: { isActive: true, name: s.name } })
        skipped++
      }
    }
    return NextResponse.json({ success: true, created, skipped, totalSources: await db.source.count() })
  }

  // Migrate v1 submissions (submitted + accepted)
  if (action === 'migrate-submissions') {
    const dataDir = path.join(process.cwd(), 'data')
    const importSource = await findOrCreateSource('v1-import')

    async function migrateSubFile(filename: string, status: SubStatus) {
      const filePath = path.join(dataDir, filename)
      if (!fs.existsSync(filePath)) return { created: 0, skipped: 0, missing: [`${filename} not found`] }
      const items: V1Submission[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      let created = 0, skipped = 0
      const missing: string[] = []
      for (const sub of items) {
        try {
          const comp = await findOrCreateCompetitionForSubmission(sub, importSource.id)
          const existing = await db.submission.findFirst({ where: { competitionId: comp.id, notes: { contains: sub.title } } })
          if (!existing) {
            let submittedAt: Date | null = null
            if (sub.date) { const d = new Date(sub.date); if (!isNaN(d.getTime())) submittedAt = d }
            await db.submission.create({
              data: {
                competitionId: comp.id,
                status,
                submittedAt,
                notes: [`Titel: ${sub.title}`, `Thema: ${sub.theme}`, `Publikation: ${sub.publication}`].join(' | '),
              }
            })
            created++
          } else { skipped++ }
        } catch (err) { missing.push(`${sub.name}: ${err instanceof Error ? err.message : String(err)}`) }
      }
      return { created, skipped, missing }
    }

    const subResult = await migrateSubFile('server_submitted.json', 'SUBMITTED')
    const accResult = await migrateSubFile('server_accepted.json', 'ACCEPTED')

    return NextResponse.json({
      success: true,
      submitted: subResult,
      accepted: accResult,
      totalSubmissions: await db.submission.count(),
    })
  }

  // Default: migrate v1 competitions from data.json
  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json')
    if (!fs.existsSync(dataPath)) return NextResponse.json({ error: `data.json not found at ${dataPath}` }, { status: 404 })
    const raw = fs.readFileSync(dataPath, 'utf-8')
    const data = JSON.parse(raw)
    const competitions: V1Competition[] = data.competitions || []
    let created = 0, updated = 0, skipped = 0
    const errors: string[] = []
    for (const comp of competitions) {
      try {
        const source = await findOrCreateSource(comp.source || 'v1-import')
        let deadline: Date | null = null
        if (comp.deadline) { const d = new Date(comp.deadline); if (!isNaN(d.getTime())) deadline = d }
        const compData = {
          legacyId: comp.id, type: mapType(comp.type), name: comp.name,
          organizer: comp.organizer ?? null, deadline, theme: comp.theme ?? null,
          genres: comp.genres ?? [], prize: comp.prize ?? null, maxLength: comp.maxLength ?? null,
          requirements: comp.requirements ?? null, ageRestriction: comp.ageRestriction ?? null,
          regionRestriction: comp.regionRestriction ?? null, fee: comp.fee ?? null,
          description: comp.description ?? null, sourceId: source.id,
        }
        const existing = await db.competition.findUnique({ where: { url: comp.url } })
        if (existing) { await db.competition.update({ where: { id: existing.id }, data: compData }); updated++ }
        else { await db.competition.create({ data: { ...compData, url: comp.url } }); created++ }
      } catch (err) { errors.push(`${comp.name}: ${err instanceof Error ? err.message : String(err)}`); skipped++ }
    }
    return NextResponse.json({ success: true, total: competitions.length, created, updated, skipped, errors: errors.slice(0, 10) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [competitions, sources, submissions] = await Promise.all([
    db.competition.count(), db.source.count(), db.submission.count()
  ])
  return NextResponse.json({ competitions, sources, submissions })
}
