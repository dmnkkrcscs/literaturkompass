import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'LitKompass2026!update'

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. Set it in Coolify environment variables.' },
      { status: 503 }
    )
  }

  const sourceId = request.nextUrl.searchParams.get('sourceId') ?? undefined

  try {
    const { crawlAllSources, crawlSource } = await import('@/server/crawl/pipeline')

    let stats
    if (sourceId) {
      const source = await db.source.findUnique({ where: { id: sourceId } })
      if (!source) return NextResponse.json({ error: `Source ${sourceId} not found` }, { status: 404 })
      stats = [await crawlSource(source)]
    } else {
      stats = await crawlAllSources()
    }

    const totals = stats.reduce(
      (acc, s) => ({
        success: acc.success + s.successCount,
        duplicate: acc.duplicate + s.duplicateCount,
        irrelevant: acc.irrelevant + s.irrelevantCount,
        failed: acc.failed + s.failureCount,
        costCents: acc.costCents + s.costCents,
      }),
      { success: 0, duplicate: 0, irrelevant: 0, failed: 0, costCents: 0 }
    )

    return NextResponse.json({
      success: true,
      sources: stats.map((s) => ({
        name: s.sourceName,
        found: s.totalUrls,
        new: s.successCount,
        duplicate: s.duplicateCount,
        irrelevant: s.irrelevantCount,
        failed: s.failureCount,
        costCents: s.costCents,
      })),
      totals,
      totalCostUSD: (totals.costCents / 100).toFixed(3),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sources = await db.source.findMany({
    select: { id: true, name: true, url: true, isActive: true, lastCrawl: true, totalCrawls: true, successRate: true },
    orderBy: { name: 'asc' },
  })
  const competitionCount = await db.competition.count()
  return NextResponse.json({ competitionCount, sources })
}
