let crawlRunning = false

async function runCrawl() {
  if (crawlRunning) {
    console.log('[Scheduler] Crawl already running, skipping')
    return
  }
  crawlRunning = true
  try {
    const { crawlAllSources } = await import('@/server/crawl/pipeline')
    await crawlAllSources()
    console.log('[Scheduler] Crawl completed.')
  } catch (e) {
    console.error('[Scheduler] Crawl failed:', e)
  } finally {
    crawlRunning = false
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const shouldRun =
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_SCHEDULER === 'true'

  if (!shouldRun) {
    console.log('[Scheduler] Skipping auto-crawl (not production and ENABLE_SCHEDULER not set)')
    return
  }

  console.log('[Scheduler] Auto-crawl scheduler starting...')

  // Initial seed after 30s delay (non-blocking), then schedule crawl
  // IMPORTANT: Do NOT await the crawl — it blocks the server from handling requests
  setTimeout(async () => {
    try {
      const { autoSeedSources } = await import('@/server/crawl/auto-seed')
      await autoSeedSources()
    } catch (e) {
      console.error('[Scheduler] Auto-seed failed:', e)
    }

    // Fire-and-forget: crawl runs in background, server stays responsive
    runCrawl().catch((e) => console.error('[Scheduler] Initial crawl failed:', e))

    // Schedule daily crawl (also fire-and-forget)
    setInterval(() => {
      runCrawl().catch((e) => console.error('[Scheduler] Scheduled crawl failed:', e))
    }, 24 * 60 * 60 * 1000)
  }, 30_000)
}
