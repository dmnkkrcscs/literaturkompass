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
      // Just return a trigger response — actual crawl happens via BullMQ
      return {
        message: 'Crawl job triggered successfully',
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
