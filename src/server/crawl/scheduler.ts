import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import { crawlAllSources } from './pipeline'
import { db } from '@/lib/db'

/**
 * Initialize Redis client for BullMQ
 */
function getRedisClient() {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
  })
}

/**
 * Queue for crawling competitions
 */
let crawlQueue: Queue | null = null

/**
 * Queue for deadline reminders
 */
let reminderQueue: Queue | null = null

/**
 * Initialize crawl queue
 */
export function initializeCrawlQueue(): Queue {
  if (crawlQueue) {
    return crawlQueue
  }

  const redis = getRedisClient()
  crawlQueue = new Queue('crawl', { connection: redis })

  console.log('[Scheduler] Crawl queue initialized')
  return crawlQueue
}

/**
 * Initialize reminder queue
 */
export function initializeReminderQueue(): Queue {
  if (reminderQueue) {
    return reminderQueue
  }

  const redis = getRedisClient()
  reminderQueue = new Queue('reminders', { connection: redis })

  console.log('[Scheduler] Reminder queue initialized')
  return reminderQueue
}

/**
 * Schedule daily crawl at 08:00 local time
 */
export async function scheduleDailyCrawl(): Promise<void> {
  const queue = initializeCrawlQueue()

  try {
    // Remove existing recurring job if it exists
    const repeatableJobs = await queue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.name === 'crawl-all-sources') {
        await queue.removeRepeatableByKey(job.key)
      }
    }

    // Schedule new daily job at 08:00
    await queue.add(
      'crawl-all-sources',
      {},
      {
        repeat: {
          pattern: '0 8 * * *', // Daily at 08:00
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )

    console.log('[Scheduler] Daily crawl scheduled for 08:00')
  } catch (error) {
    console.error('[Scheduler] Error scheduling daily crawl:', error)
    throw error
  }
}

/**
 * Schedule deadline reminders check
 * Runs every 6 hours to check for upcoming deadlines
 */
export async function scheduleDeadlineReminders(): Promise<void> {
  const queue = initializeReminderQueue()

  try {
    // Remove existing recurring job if it exists
    const repeatableJobs = await queue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.name === 'check-deadlines') {
        await queue.removeRepeatableByKey(job.key)
      }
    }

    // Schedule job to run every 6 hours
    await queue.add(
      'check-deadlines',
      {},
      {
        repeat: {
          pattern: '0 */6 * * *', // Every 6 hours
        },
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )

    console.log('[Scheduler] Deadline reminder check scheduled every 6 hours')
  } catch (error) {
    console.error('[Scheduler] Error scheduling deadline reminders:', error)
    throw error
  }
}

/**
 * Handler for crawl job
 * Called by the worker when a crawl job is dequeued
 */
export async function processCrawlJob(): Promise<void> {
  console.log('[Scheduler] Processing crawl job')
  const startTime = Date.now()

  try {
    const stats = await crawlAllSources()

    const totalProcessingMs = stats.reduce(
      (sum, s) => sum + s.processingTimeMs,
      0
    )
    const totalCost = stats.reduce((sum, s) => sum + s.costCents, 0)

    console.log('[Scheduler] Crawl job completed')
    console.log(`[Scheduler] Total time: ${totalProcessingMs}ms`)
    console.log(`[Scheduler] Total cost: ${(totalCost / 100).toFixed(2)} USD`)
  } catch (error) {
    console.error('[Scheduler] Error in crawl job:', error)
    throw error
  }
}

/**
 * Handler for reminder job
 * Checks for starred items with upcoming deadlines and sends Telegram reminders
 */
export async function processReminderJob(): Promise<void> {
  console.log('[Scheduler] Processing deadline reminder job')

  try {
    // Get all starred competitions with deadlines in the next 7 days
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingCompetitions = await db.competition.findMany({
      where: {
        starred: true,
        deadline: {
          gte: tomorrow,
          lte: nextWeek,
        },
      },
      select: {
        id: true,
        name: true,
        deadline: true,
      },
    })

    if (upcomingCompetitions.length === 0) {
      console.log('[Scheduler] No upcoming deadlines found')
      return
    }

    console.log(
      `[Scheduler] Found ${upcomingCompetitions.length} competitions with upcoming deadlines`
    )

    // TODO: Send Telegram reminders for each competition
    // This would require:
    // 1. Get user's Telegram chat ID from database
    // 2. Format reminder message
    // 3. Send via Telegram Bot API

    for (const competition of upcomingCompetitions) {
      const daysUntilDeadline = Math.ceil(
        (competition.deadline!.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )

      console.log(
        `[Scheduler] Reminder: "${competition.name}" deadline in ${daysUntilDeadline} days`
      )
    }
  } catch (error) {
    console.error('[Scheduler] Error in reminder job:', error)
    throw error
  }
}

/**
 * Create workers for job queues
 */
export async function createWorkers(): Promise<{
  crawlWorker: Worker
  reminderWorker: Worker
}> {
  const redis = getRedisClient()

  // Create crawl worker
  const crawlWorker = new Worker(
    'crawl',
    async (job) => {
      console.log(`[Worker] Processing crawl job: ${job.id}`)
      await processCrawlJob()
    },
    {
      connection: redis,
      concurrency: 1, // Only one crawl at a time
    }
  )

  // Create reminder worker
  const reminderWorker = new Worker(
    'reminders',
    async (job) => {
      console.log(`[Worker] Processing reminder job: ${job.id}`)
      await processReminderJob()
    },
    {
      connection: redis,
      concurrency: 1,
    }
  )

  // Set up event handlers
  crawlWorker.on('completed', (job) => {
    console.log(`[Worker] Crawl job ${job.id} completed`)
  })

  crawlWorker.on('failed', (job, error) => {
    console.error(`[Worker] Crawl job ${job?.id} failed:`, error)
  })

  reminderWorker.on('completed', (job) => {
    console.log(`[Worker] Reminder job ${job.id} completed`)
  })

  reminderWorker.on('failed', (job, error) => {
    console.error(`[Worker] Reminder job ${job?.id} failed:`, error)
  })

  console.log('[Worker] Workers created')

  return { crawlWorker, reminderWorker }
}

/**
 * Initialize all schedulers and workers
 */
export async function initializeScheduler(): Promise<void> {
  console.log('[Scheduler] Initializing scheduler')

  try {
    // Initialize queues
    initializeCrawlQueue()
    initializeReminderQueue()

    // Create queue schedulers to ensure repeating jobs are scheduled correctly
    const crawlQueueScheduler = new QueueScheduler('crawl', {
      connection: getRedisClient(),
    })

    const reminderQueueScheduler = new QueueScheduler('reminders', {
      connection: getRedisClient(),
    })

    // Schedule jobs
    await scheduleDailyCrawl()
    await scheduleDeadlineReminders()

    console.log('[Scheduler] Scheduler initialized successfully')
  } catch (error) {
    console.error('[Scheduler] Error initializing scheduler:', error)
    throw error
  }
}

/**
 * Get crawl queue
 */
export function getCrawlQueue(): Queue {
  if (!crawlQueue) {
    return initializeCrawlQueue()
  }
  return crawlQueue
}

/**
 * Get reminder queue
 */
export function getReminderQueue(): Queue {
  if (!reminderQueue) {
    return initializeReminderQueue()
  }
  return reminderQueue
}
