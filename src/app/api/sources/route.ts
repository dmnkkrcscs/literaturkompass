import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/sources — alle Quellen abrufen */
export async function GET() {
  try {
    const sources = await db.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { competitions: true, crawlLogs: true } },
      },
    })
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('GET /api/sources error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Quellen' }, { status: 500 })
  }
}

/** POST /api/sources — neue Quelle anlegen */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, url } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Name und URL sind erforderlich' }, { status: 400 })
    }

    // URL normalisieren
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Prüfen ob URL bereits existiert
    const existing = await db.source.findUnique({ where: { url: normalizedUrl } })
    if (existing) {
      // Statt Fehler: bestehende Quelle zurückgeben
      return NextResponse.json({ source: existing, existed: true })
    }

    const source = await db.source.create({
      data: {
        name: name.trim(),
        url: normalizedUrl,
        type: 'MANUAL',
        isActive: true,
      },
    })

    return NextResponse.json({ source, existed: false }, { status: 201 })
  } catch (error) {
    console.error('POST /api/sources error:', error)
    return NextResponse.json({ error: 'Fehler beim Anlegen der Quelle' }, { status: 500 })
  }
}
