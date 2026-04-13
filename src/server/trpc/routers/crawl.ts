import { z } from 'zod'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { publicProcedure, router } from '../init'
import { getCrawlQueue } from '@/server/crawl/scheduler'

export const crawlRouter = router({
  trigger: publicProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const queue = getCrawlQueue()
      const job = await queue.add('crawl-all-sources-manual', {
        sourceId: input.sourceId,
        manual: true,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      })

      return {
        message: 'Crawl job enqueued',
        jobId: job.id,
        timestamp: new Date(),
      }
    }),

  logs: publicProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
        take: z.number().int().default(50),
        skip: z.number().int().default(0),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.CrawlLogWhereInput = {
        ...(input.sourceId && { sourceId: input.sourceId }),
      }

      const [logs, count] = await Promise.all([
        db.crawlLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.take,
          skip: input.skip,
          include: {
            source: {
              select: { id: true, name: true },
            },
          },
        }),
        db.crawlLog.count({ where }),
      ])

      return {
        logs,
        count,
        pagination: {
          take: input.take,
          skip: input.skip,
          total: count,
          hasMore: input.skip + input.take < count,
        },
      }
    }),

  /**
   * Aggregated crawl sessions — groups logs by source + time window
   * to show summary stats per crawl run (for the Crawl-Log page)
   */
  sessions: publicProcedure
    .input(
      z.object({
        take: z.number().int().default(50),
        skip: z.number().int().default(0),
      })
    )
    .query(async ({ input }) => {
      // Get crawl logs grouped by source and approximate crawl session
      // A "session" is all logs from the same source within the same hour
      const logs = await db.crawlLog.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          source: {
            select: { id: true, name: true },
          },
        },
      })

      // Group logs into sessions (same source, within 2 hours of each other)
      interface CrawlSession {
        sourceId: string
        sourceName: string
        startedAt: Date
        endedAt: Date
        successCount: number
        duplicateCount: number
        irrelevantCount: number
        failureCount: number
        totalUrls: number
      }

      const sessions: CrawlSession[] = []
      let currentSession: CrawlSession | null = null

      // Logs are already sorted by createdAt desc
      for (const log of logs) {
        const logTime = new Date(log.createdAt).getTime()

        if (
          currentSession &&
          currentSession.sourceId === log.sourceId &&
          Math.abs(new Date(currentSession.startedAt).getTime() - logTime) < 2 * 60 * 60 * 1000
        ) {
          // Same session — update stats
          if (logTime < new Date(currentSession.startedAt).getTime()) {
            currentSession.startedAt = log.createdAt
          }
          if (logTime > new Date(currentSession.endedAt).getTime()) {
            currentSession.endedAt = log.createdAt
          }

          currentSession.totalUrls++
          if (log.status === 'SUCCESS') currentSession.successCount++
          else if (log.status === 'DUPLICATE') currentSession.duplicateCount++
          else if (log.status === 'IRRELEVANT') currentSession.irrelevantCount++
          else if (log.status === 'FAILED') currentSession.failureCount++
        } else {
          // New session
          if (currentSession) sessions.push(currentSession)

          currentSession = {
            sourceId: log.sourceId,
            sourceName: log.source?.name || 'Unbekannt',
            startedAt: log.createdAt,
            endedAt: log.createdAt,
            successCount: log.status === 'SUCCESS' ? 1 : 0,
            duplicateCount: log.status === 'DUPLICATE' ? 1 : 0,
            irrelevantCount: log.status === 'IRRELEVANT' ? 1 : 0,
            failureCount: log.status === 'FAILED' ? 1 : 0,
            totalUrls: 1,
          }
        }
      }

      // Don't forget the last session
      if (currentSession) sessions.push(currentSession)

      const total = sessions.length
      const paginatedSessions = sessions.slice(input.skip, input.skip + input.take)

      return {
        sessions: paginatedSessions,
        pagination: {
          take: input.take,
          skip: input.skip,
          total,
          hasMore: input.skip + input.take < total,
        },
      }
    }),

  status: publicProcedure
    .input(
      z.object({
        logId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (input.logId) {
        return db.crawlLog.findUnique({
          where: { id: input.logId },
          include: {
            source: {
              select: { id: true, name: true },
            },
          },
        })
      }

      return db.crawlLog.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          source: {
            select: { id: true, name: true },
          },
        },
      })
    }),
})
