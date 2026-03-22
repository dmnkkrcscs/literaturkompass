import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const submissionRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['PLANNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
        competitionId: z.string().optional(),
        take: z.number().int().default(20),
        skip: z.number().int().default(0),
      })
    )
    .query(async ({ input }) => {
      const where: any = {}

      if (input.status) {
        where.status = input.status
      }
      if (input.competitionId) {
        where.competitionId = input.competitionId
      }

      const [submissions, count] = await Promise.all([
        db.submission.findMany({
          where,
          include: {
            competition: true,
          },
          orderBy: { createdAt: 'desc' },
          take: input.take,
          skip: input.skip,
        }),
        db.submission.count({ where }),
      ])

      return {
        submissions,
        count,
        pagination: {
          take: input.take,
          skip: input.skip,
          total: count,
          hasMore: input.skip + input.take < count,
        },
      }
    }),

  create: publicProcedure
    .input(
      z.object({
        competitionId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const submission = await db.submission.create({
        data: {
          competitionId: input.competitionId,
          title: input.title,
          status: 'PLANNED',
        },
        include: {
          competition: true,
        },
      })

      return submission
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PLANNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']),
      })
    )
    .mutation(async ({ input }) => {
      const submission = await db.submission.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          competition: true,
        },
      })

      return submission
    }),
})
