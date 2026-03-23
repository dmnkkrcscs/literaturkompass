import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/crawl/start
 * Startet einen Crawl für eine bestimmte Quelle (kein Admin-Token nötig).
 * Body: { sourceId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sourceId } = body

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId fehlt' }, { status: 400 })
    }

    const source = await db.source.findUnique({ where: { id: sourceId } })
    if (!source) {
      return NextResponse.json({ error: 'Quelle nicht gefunden' }, { status: 404 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Kein Anthropic Key → Quelle trotzdem gespeichert, Crawl nicht möglich
      return NextResponse.json({
        success: true,
        queued: false,
        message: 'Quelle gespeichert. Crawl benötigt ANTHROPIC_API_KEY in den Umgebungsvariablen.',
      })
    }

    // Crawl asynchron starten (fire-and-forget), damit die Response sofort zurückkommt
    import('@/server/crawl/pipeline')
      .then(({ crawlSource }) => crawlSource(source))
      .catch((err) => console.error('Background crawl error:', err))

    return NextResponse.json({
      success: true,
      queued: true,
      message: `Crawl für „${source.name}" gestartet.`,
    })
  } catch (error) {
    console.error('POST /api/crawl/start error:', error)
    return NextResponse.json({ error: 'Fehler beim Starten des Crawls' }, { status: 500 })
  }
}
