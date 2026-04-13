export async function register() {
  if (typeof window !== 'undefined') return

  // Only in server runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const shouldRun =
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_SCHEDULER === 'true'

    if (!shouldRun) {
      console.log('[Scheduler] Skipping auto-crawl (not production and ENABLE_SCHEDULER not set)')
      return
    }

    const { crawlAllSources } = await import('@/server/crawl/pipeline')
    const { autoSeedSources } = await import('@/server/crawl/auto-seed')

    console.log('[Scheduler] Auto-crawl scheduler starting...')

    // Run initial seed + crawl after 30s delay
    setTimeout(async () => {
      try {
        console.log('[Scheduler] Auto-seeding sources...')
        await autoSeedSources()
      } catch (e) {
        console.error('[Scheduler] Auto-seed failed:', e)
      }

      try {
        console.log('[Scheduler] Running initial crawl...')
        await crawlAllSources()
        console.log('[Scheduler] Initial crawl completed.')
      } catch (e) {
        console.error('[Scheduler] Initial crawl failed:', e)
      }
    }, 30_000)

    // Schedule daily crawl (every 24h)
    setInterval(async () => {
      console.log('[Scheduler] Running scheduled daily crawl...')
      try {
        await crawlAllSources()
        console.log('[Scheduler] Scheduled crawl completed.')
      } catch (e) {
        console.error('[Scheduler] Scheduled crawl failed:', e)
      }
    }, 24 * 60 * 60 * 1000)
  }
}
