import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'
import type { CompType } from '@prisma/client'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'LitKompass2026!update'

interface V1Competition {
  id: string
  type: string
  name: string
  organizer?: string
  deadline?: string
  theme?: string
  genres?: string[]
  prize?: string
  maxLength?: string
  requirements?: string
  ageRestriction?: string | null
  regionRestriction?: string | null
  fee?: string | null
  url: string
  description?: string
  source: string
}

function mapType(type: string): CompType {
  const m: Record<string, CompType> = {
    wettbewerb: 'WETTBEWERB',
    anthologie: 'ANTHOLOGIE',
    zeitschrift: 'ZEITSCHRIFT',
  }
  return m[type.toLowerCase()] ?? 'WETTBEWERB'
}

async function findOrCreateSource(sourceName: string) {
  const existing = await db.source.findUnique({ where: { url: sourceName } })
  if (existing) return existing
  return db.source.create({
    data: { name: sourceName, url: sourceName, type: 'AGGREGATOR', isActive: true },
  })
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'data.json')
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: `data.json not found at ${dataPath}` }, { status: 404 })
    }

    const raw = fs.readFileSync(dataPath, 'utf-8')
    const data = JSON.parse(raw)
    const competitions: V1Competition[] = data.competitions || []

    let created = 0, updated = 0, skipped = 0
    const errors: string[] = []

    for (const comp of competitions) {
      try {
        const source = await findOrCreateSource(comp.source || 'v1-import')
        let deadline: Date | null = null
        if (comp.deadline) {
          const d = new Date(comp.deadline)
          if (!isNaN(d.getTime())) deadline = d
        }
        const compData = {
          legacyId: comp.id,
          type: mapType(comp.type),
          name: comp.name,
          organizer: comp.organizer ?? null,
          deadline,
          theme: comp.theme ?? null,
          genres: comp.genres ?? [],
          prize: comp.prize ?? null,
          maxLength: comp.maxLength ?? null,
          requirements: comp.requirements ?? null,
          ageRestriction: comp.ageRestriction ?? null,
          regionRestriction: comp.regionRestriction ?? null,
          fee: comp.fee ?? null,
          description: comp.description ?? null,
          sourceId: source.id,
        }
        const existing = await db.competition.findUnique({ where: { url: comp.url } })
        if (existing) {
          await db.competition.update({ where: { id: existing.id }, data: compData })
          updated++
        } else {
          await db.competition.create({ data: { ...compData, url: comp.url } })
          created++
        }
      } catch (err) {
        errors.push(`${comp.name}: ${err instanceof Error ? err.message : String(err)}`)
        skipped++
      }
    }

    return NextResponse.json({ success: true, total: competitions.length, created, updated, skipped, errors: errors.slice(0, 10) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await db.competition.count()
  const sources = await db.source.count()
  return NextResponse.json({ competitions: count, sources })
}
