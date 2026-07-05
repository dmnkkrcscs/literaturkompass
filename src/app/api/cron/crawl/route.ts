import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Simple auth via secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET is not configured — refusing request')
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Enqueue a BullMQ job so the dedicated worker container runs the crawl.
    // Running crawlAllSources() inline here blocks the web server's event loop
    // for minutes (→ 504 timeouts on static assets like CSS and slow page
    // loads). The worker already listens on the `crawl` queue.
    const { getCrawlQueue } = await import('@/server/crawl/scheduler')
    const queue = getCrawlQueue()

    const job = await queue.add(
      'crawl-all-sources',
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    )

    return NextResponse.json({
      success: true,
      message: 'Crawl queued for all sources',
      jobId: job.id,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('[Cron] Failed to enqueue crawl:', error)
    return NextResponse.json(
      { error: 'Failed to enqueue crawl', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
