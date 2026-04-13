import { z } from 'zod'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { publicProcedure, router } from '../init'

export const crawlRouter = router({
  trigger: publicProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Run crawl directly without BullMQ
      const { crawlAllSources, crawlSource } = await import('@/server/crawl/pipeline')

      // Fire and forget - don't await (would timeout the request)
      const promise = input.sourceId
        ? (async () => {
            const source = await db.source.findUnique({ where: { id: input.sourceId } })
            if (!source) throw new Error('Source not found')
            return [await crawlSource(source)]
          })()
        : crawlAllSources()

      promise
        .then(stats => console.log('[Crawl] Manual trigger completed:', JSON.stringify(stats.map(s => ({ name: s.sourceName, success: s.successCount, failed: s.failureCount })))))
        .catch(err => console.error('[Crawl] Manual trigger failed:', err))

      return {
        message: 'Crawl started',
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
const where: any = {
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
