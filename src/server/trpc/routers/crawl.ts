import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const crawlRouter = router({
  trigger: publicProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // For now, just log the trigger. BullMQ integration will be added later
      const timestamp = new Date()

      // Create a log entry
      const log = await db.crawlLog.create({
        data: {
          sourceId: input.sourceId,
          status: 'STARTED',
          startedAt: timestamp,
          message: 'Crawl job triggered',
        },
      })

      // TODO: Queue job with BullMQ
      // const queue = new Queue('crawl')
      // await queue.add('crawl', { sourceId: input.sourceId }, { jobId: log.id })

      return {
        logId: log.id,
        message: 'Crawl job triggered successfully',
        timestamp,
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
      const where: any = {}

      if (input.sourceId) {
        where.sourceId = input.sourceId
      }

      const [logs, count] = await Promise.all([
        db.crawlLog.findMany({
          where,
          orderBy: { startedAt: 'desc' },
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

  status: publicProcedure
    .input(
      z.object({
        logId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (input.logId) {
        const log = await db.crawlLog.findUnique({
          where: { id: input.logId },
          include: {
            source: {
              select: { id: true, name: true },
            },
          },
        })
        return log
      }

      // Return the latest crawl status
      const latestLog = await db.crawlLog.findFirst({
        orderBy: { startedAt: 'desc' },
        include: {
          source: {
            select: { id: true, name: true },
          },
        },
      })

      return latestLog
    }),
})
