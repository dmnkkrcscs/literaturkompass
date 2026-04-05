import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import { crawlAllSources } from './pipeline'
import { db } from '@/lib/db'
import { sendMessage, sendDeadlineReminder } from '@/lib/telegram'
import { generateTelegramDigest } from '@/server/ai/telegram-digest'

/**
 * Initialize Redis client for BullMQ
 */
function getRedisClient(): any {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
  })
}

let crawlQueue: Queue | null = null
let reminderQueue: Queue | null = null
let digestQueue: Queue | null = null

export function initializeCrawlQueue(): Queue {
  if (crawlQueue) return crawlQueue
  crawlQueue = new Queue('crawl', { connection: getRedisClient() })
  console.log('[Scheduler] Crawl queue initialized')
  return crawlQueue
}

export function initializeReminderQueue(): Queue {
  if (reminderQueue) return reminderQueue
  reminderQueue = new Queue('reminders', { connection: getRedisClient() })
  console.log('[Scheduler] Reminder queue initialized')
  return reminderQueue
}

export function initializeDigestQueue(): Queue {
  if (digestQueue) return digestQueue
  digestQueue = new Queue('digest', { connection: getRedisClient() })
  console.log('[Scheduler] Digest queue initialized')
  return digestQueue
}

/**
 * Schedule daily crawl at 08:00
 */
export async function scheduleDailyCrawl(): Promise<void> {
  const queue = initializeCrawlQueue()
  const repeatableJobs = await queue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'crawl-all-sources') {
      await queue.removeRepeatableByKey(job.key)
    }
  }

  await queue.add('crawl-all-sources', {}, {
    repeat: { pattern: '0 8 * * *' },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
  console.log('[Scheduler] Daily crawl scheduled for 08:00')
}

/**
 * Schedule deadline reminders every 6 hours
 */
export async function scheduleDeadlineReminders(): Promise<void> {
  const queue = initializeReminderQueue()
  const repeatableJobs = await queue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'check-deadlines') {
      await queue.removeRepeatableByKey(job.key)
    }
  }

  await queue.add('check-deadlines', {}, {
    repeat: { pattern: '0 */6 * * *' },
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  })
  console.log('[Scheduler] Deadline reminder check scheduled every 6 hours')
}

/**
 * Schedule daily AI digest at 09:00 (1h after crawl)
 */
export async function scheduleDailyDigest(): Promise<void> {
  const queue = initializeDigestQueue()
  const repeatableJobs = await queue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === 'daily-digest') {
      await queue.removeRepeatableByKey(job.key)
    }
  }

  await queue.add('daily-digest', {}, {
    repeat: { pattern: '0 9 * * *' },
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  })
  console.log('[Scheduler] Daily digest scheduled for 09:00')
}

/**
 * Handler for crawl job
 */
export async function processCrawlJob(): Promise<void> {
  console.log('[Scheduler] Processing crawl job')
  try {
    const stats = await crawlAllSources()
    const totalCost = stats.reduce((sum, s) => sum + s.costCents, 0)
    console.log(`[Scheduler] Crawl completed. Cost: ${(totalCost / 100).toFixed(2)} USD`)
  } catch (error) {
    console.error('[Scheduler] Error in crawl job:', error)
    throw error
  }
}

/**
 * Handler for reminder job — sends actual Telegram messages
 */
export async function processReminderJob(): Promise<void> {
  console.log('[Scheduler] Processing deadline reminder job')

  try {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcomingCompetitions = await db.competition.findMany({
      where: {
        starred: true,
        deadline: {
          gte: now,
          lte: nextWeek,
        },
      },
      select: {
        id: true,
        name: true,
        deadline: true,
        url: true,
      },
    })

    if (upcomingCompetitions.length === 0) {
      console.log('[Scheduler] No upcoming deadlines found')
      return
    }

    console.log(`[Scheduler] Found ${upcomingCompetitions.length} competitions with upcoming deadlines`)

    for (const competition of upcomingCompetitions) {
      const daysLeft = Math.ceil(
        (competition.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Check if we already sent a reminder for this competition today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const alreadySent = await db.notificationLog.findFirst({
        where: {
          competitionId: competition.id,
          type: 'deadline_reminder',
          sentAt: { gte: today },
        },
      })

      if (alreadySent) continue

      const sent = await sendDeadlineReminder(
        { name: competition.name, url: competition.url, deadline: competition.deadline! },
        daysLeft
      )

      if (sent) {
        await db.notificationLog.create({
          data: {
            competitionId: competition.id,
            type: 'deadline_reminder',
            message: `Reminder: ${competition.name} in ${daysLeft} days`,
          },
        })
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error in reminder job:', error)
    throw error
  }
}

/**
 * Handler for daily digest job — AI-generated Telegram summary
 */
export async function processDailyDigestJob(): Promise<void> {
  console.log('[Scheduler] Processing daily digest job')

  try {
    const message = await generateTelegramDigest()
    const sent = await sendMessage(message)

    if (sent) {
      await db.notificationLog.create({
        data: {
          type: 'daily_digest',
          message,
        },
      })
      console.log('[Scheduler] Daily digest sent via Telegram')
    } else {
      console.warn('[Scheduler] Failed to send daily digest')
    }
  } catch (error) {
    console.error('[Scheduler] Error in digest job:', error)
    throw error
  }
}

/**
 * Create workers for all job queues
 */
export async function createWorkers(): Promise<{
  crawlWorker: Worker
  reminderWorker: Worker
  digestWorker: Worker
}> {
  const redis = getRedisClient()

  const crawlWorker = new Worker(
    'crawl',
    async (job) => {
      console.log(`[Worker] Processing crawl job: ${job.id}`)
      await processCrawlJob()
    },
    { connection: redis, concurrency: 1 }
  )

  const reminderWorker = new Worker(
    'reminders',
    async (job) => {
      console.log(`[Worker] Processing reminder job: ${job.id}`)
      await processReminderJob()
    },
    { connection: redis, concurrency: 1 }
  )

  const digestWorker = new Worker(
    'digest',
    async (job) => {
      console.log(`[Worker] Processing digest job: ${job.id}`)
      await processDailyDigestJob()
    },
    { connection: redis, concurrency: 1 }
  )

  // Event handlers
  for (const [name, worker] of [['Crawl', crawlWorker], ['Reminder', reminderWorker], ['Digest', digestWorker]] as const) {
    worker.on('completed', (job) => console.log(`[Worker] ${name} job ${job.id} completed`))
    worker.on('failed', (job, error) => console.error(`[Worker] ${name} job ${job?.id} failed:`, error))
  }

  console.log('[Worker] All workers created')
  return { crawlWorker, reminderWorker, digestWorker }
}

/**
 * Initialize all schedulers
 */
export async function initializeScheduler(): Promise<void> {
  console.log('[Scheduler] Initializing scheduler')
  try {
    initializeCrawlQueue()
    initializeReminderQueue()
    initializeDigestQueue()

    await scheduleDailyCrawl()
    await scheduleDeadlineReminders()
    await scheduleDailyDigest()

    console.log('[Scheduler] Scheduler initialized successfully')
  } catch (error) {
    console.error('[Scheduler] Error initializing scheduler:', error)
    throw error
  }
}

export function getCrawlQueue(): Queue {
  return crawlQueue || initializeCrawlQueue()
}

export function getReminderQueue(): Queue {
  return reminderQueue || initializeReminderQueue()
}

export function getDigestQueue(): Queue {
  return digestQueue || initializeDigestQueue()
}
