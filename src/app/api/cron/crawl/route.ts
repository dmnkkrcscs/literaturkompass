import { NextResponse } from 'next/server'
import { crawlAllSources } from '@/server/crawl/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  // Simple auth via secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await crawlAllSources()
    return NextResponse.json({
      success: true,
      stats: stats.map(s => ({
        source: s.sourceName,
        total: s.totalUrls,
        success: s.successCount,
        duplicate: s.duplicateCount,
        irrelevant: s.irrelevantCount,
        failed: s.failureCount,
      })),
    })
  } catch (error) {
    console.error('[Cron] Crawl failed:', error)
    return NextResponse.json(
      { error: 'Crawl failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
