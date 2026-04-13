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

  // Initial seed + crawl after 30s delay, then repeat every 24h
  setTimeout(async () => {
    try {
      const { autoSeedSources } = await import('@/server/crawl/auto-seed')
      await autoSeedSources()
    } catch (e) {
      console.error('[Scheduler] Auto-seed failed:', e)
    }

    await runCrawl()
    setInterval(runCrawl, 24 * 60 * 60 * 1000)
  }, 30_000)
}
