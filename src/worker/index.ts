import { initializeScheduler, createWorkers } from '@/server/crawl/scheduler'
import { autoSeedSources } from '@/server/crawl/auto-seed'
import { db } from '@/lib/db'

/**
 * Worker entry point
 * Starts BullMQ workers for crawl and reminder queues
 * Handles graceful shutdown
 */

async function main() {
  console.log('[Worker] Starting Literaturkompass worker process')
  console.log(`[Worker] Node environment: ${process.env.NODE_ENV}`)
  console.log(`[Worker] Redis host: ${process.env.REDIS_HOST || 'localhost'}`)

  try {
    // Auto-seed sources (ensures all 11 aggregator sources exist with correct URLs)
    await autoSeedSources()

    // Initialize scheduler and create workers
    await initializeScheduler()
    const { crawlWorker, reminderWorker, digestWorker } = await createWorkers()

    console.log('[Worker] All workers started successfully')

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[Worker] Received ${signal}, shutting down gracefully...`)

      try {
        // Close workers
        await crawlWorker.close()
        await reminderWorker.close()
        await digestWorker.close()

        // Close database connection
        await db.$disconnect()

        console.log('[Worker] Graceful shutdown complete')
        process.exit(0)
      } catch (error) {
        console.error('[Worker] Error during shutdown:', error)
        process.exit(1)
      }
    }

    // Set up signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Keep process running
    console.log('[Worker] Worker ready and waiting for jobs')
  } catch (error) {
    console.error('[Worker] Failed to start worker:', error)
    process.exit(1)
  }
}

// Run the main function
main().catch((error) => {
  console.error('[Worker] Unexpected error:', error)
  process.exit(1)
})
