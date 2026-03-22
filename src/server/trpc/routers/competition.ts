import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

const competitionFilterSchema = z.object({
  type: z.string().optional(),
  search: z.string().optional(),
  genre: z.string().optional(),
  deadlineBefore: z.date().optional(),
  deadlineAfter: z.date().optional(),
  starred: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  minScore: z.number().optional(),
})

const paginationSchema = z.object({
  take: z.number().int().default(20),
  skip: z.number().int().default(0),
  cursor: z.string().optional(),
})

const sortSchema = z.enum(['deadline', 'relevance', 'created']).default('deadline')

export const competitionRouter = router({
  list: publicProcedure
    .input(
      z.object({
        filters: competitionFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const { filters = {}, pagination = {}, sort = 'deadline' } = input
      const { take = 20, skip = 0 } = pagination

      const where: any = {}

      // Apply filters
      if (filters.type) {
        where.type = filters.type
      }
      if (filters.genre) {
        where.genres = {
          hasSome: [filters.genre],
        }
      }
      if (filters.deadlineBefore || filters.deadlineAfter) {
        where.deadline = {}
        if (filters.deadlineBefore) {
          where.deadline.lte = filters.deadlineBefore
        }
        if (filters.deadlineAfter) {
          where.deadline.gte = filters.deadlineAfter
        }
      }
      if (filters.starred !== undefined) {
        where.starred = filters.starred
      }
      if (filters.dismissed !== undefined) {
        where.dismissed = filters.dismissed
      }
      if (filters.minScore !== undefined) {
        where.relevanceScore = {
          gte: filters.minScore,
        }
      }

      // Add search filter
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { source: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      // Determine sort order
      let orderBy: any = { deadline: 'asc' }
      if (sort === 'relevance') {
        orderBy = { relevanceScore: 'desc' }
      } else if (sort === 'created') {
        orderBy = { createdAt: 'desc' }
      }

      const [competitions, count] = await Promise.all([
        db.competition.findMany({
          where,
          orderBy,
          take,
          skip,
          include: {
            submissions: {
              select: { id: true, status: true },
            },
            analyses: {
              select: { id: true },
            },
          },
        }),
        db.competition.count({ where }),
      ])

      return {
        competitions,
        count,
        pagination: {
          take,
          skip,
          total: count,
          hasMore: skip + take < count,
        },
      }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const competition = await db.competition.findUnique({
        where: { id: input.id },
        include: {
          submissions: true,
          analyses: true,
        },
      })

      return competition
    }),

  star: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const competition = await db.competition.findUnique({
        where: { id: input.id },
        select: { starred: true },
      })

      if (!competition) {
        throw new Error('Competition not found')
      }

      const updated = await db.competition.update({
        where: { id: input.id },
        data: { starred: !competition.starred },
      })

      return updated
    }),

  dismiss: publicProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await db.competition.update({
        where: { id: input.id },
        data: { dismissed: true },
      })

      // Create user feedback if reason provided
      if (input.reason) {
        await db.userFeedback.create({
          data: {
            competitionId: input.id,
            action: 'DISMISSED',
            reason: input.reason,
          },
        })
      }

      return updated
    }),

  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const updated = await db.competition.update({
        where: { id: input.id },
        data: { dismissed: false },
      })

      return updated
    }),

  addManual: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        organizer: z.string(),
        deadline: z.date(),
        url: z.string().url(),
        type: z.string(),
        genres: z.string().array().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { genres, ...competitionData } = input

      // Get or create a manual source
      let source = await db.source.findUnique({
        where: { url: 'manual' },
      })

      if (!source) {
        source = await db.source.create({
          data: {
            name: 'Manual',
            url: 'manual',
            type: 'MANUAL',
          },
        })
      }

      const competition = await db.competition.create({
        data: {
          ...competitionData,
          sourceId: source.id,
          genres: genres || [],
        },
      })

      return competition
    }),
})
