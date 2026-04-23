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
      // Enqueue a BullMQ job so the dedicated worker container processes it.
      // Running crawlAllSources() in the web process blocks the event loop
      // (→ 504 timeouts on static assets) and is killed by the reverse proxy
      // on long runs. The worker already listens on the `crawl` queue.
      const { getCrawlQueue } = await import('@/server/crawl/scheduler')
      const queue = getCrawlQueue()

      const job = await queue.add(
        'crawl-all-sources',
        input.sourceId ? { sourceId: input.sourceId } : {},
        { attempts: 2, backoff: { type: 'exponential', delay: 2000 } }
      )

      return {
        message: input.sourceId ? 'Crawl queued for source' : 'Crawl queued for all sources',
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

  /**
   * Aggregated crawl *runs* — one row per scheduled/manual execution,
   * grouping all per-source sessions inside a 2-hour window into a single run.
   * This is what the KI-Recherche overview renders.
   */
  runs: publicProcedure
    .input(
      z.object({
        take: z.number().int().default(50),
        skip: z.number().int().default(0),
      })
    )
    .query(async ({ input }) => {
      // Pull the last ~2000 logs (covers many runs) and bucket by time.
      const logs = await db.crawlLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          createdAt: true,
          status: true,
          sourceId: true,
        },
      })

      interface RunAgg {
        startedAt: Date
        endedAt: Date
        sources: Set<string>
        successCount: number
        duplicateCount: number
        irrelevantCount: number
        failureCount: number
        totalUrls: number
      }

      // Logs come newest→oldest. Cluster them: a new cluster starts when the
      // gap to the previous log is > 30 minutes — that's a clean heuristic for
      // "different run" since a single run's parallel batches are continuous.
      const GAP_MS = 30 * 60 * 1000
      const runs: RunAgg[] = []
      let current: RunAgg | null = null
      let lastTime = 0

      for (const log of logs) {
        const t = new Date(log.createdAt).getTime()
        if (!current || lastTime - t > GAP_MS) {
          if (current) runs.push(current)
          current = {
            startedAt: log.createdAt,
            endedAt: log.createdAt,
            sources: new Set<string>(),
            successCount: 0,
            duplicateCount: 0,
            irrelevantCount: 0,
            failureCount: 0,
            totalUrls: 0,
          }
        }

        // Because logs are desc: the FIRST log we see for a cluster is the
        // newest → endedAt; we keep updating startedAt as we walk older.
        current.startedAt = log.createdAt
        current.sources.add(log.sourceId)
        current.totalUrls++
        if (log.status === 'SUCCESS') current.successCount++
        else if (log.status === 'DUPLICATE') current.duplicateCount++
        else if (log.status === 'IRRELEVANT') current.irrelevantCount++
        else if (log.status === 'FAILED') current.failureCount++

        lastTime = t
      }
      if (current) runs.push(current)

      // Sort newest first by endedAt and serialize.
      runs.sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())

      const total = runs.length
      const paginated = runs.slice(input.skip, input.skip + input.take).map((r) => ({
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationMs: r.endedAt.getTime() - r.startedAt.getTime(),
        sourceCount: r.sources.size,
        totalUrls: r.totalUrls,
        successCount: r.successCount,
        duplicateCount: r.duplicateCount,
        irrelevantCount: r.irrelevantCount,
        failureCount: r.failureCount,
        // TODO: persist trigger/user in a CrawlRun table — not tracked yet.
        trigger: 'Automatisch' as const,
        triggeredBy: null as string | null,
        status: 'Abgeschlossen' as const,
        // TODO: deadline-updates aren't tracked separately yet.
        deadlineUpdates: 0,
      }))

      return {
        runs: paginated,
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
