import { z } from 'zod'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
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
  noSubmissions: z.boolean().optional(), // Exclude competitions with SUBMITTED/ACCEPTED submissions
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

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const where: any = {
        // Hide expired deadlines unless the competition is starred
        // A deadline of April 15 means it expires after April 15, not on it
        OR: [
          { deadline: { gte: today } },
          { deadline: null },
          { starred: true },
        ],
      }

      if (filters.type) {
                where.type = filters.type
      }
      if (filters.genre) {
        where.genres = { hasSome: [filters.genre] }
      }
      if (filters.deadlineBefore || filters.deadlineAfter) {
        where.deadline = {
          ...(filters.deadlineBefore && { lte: filters.deadlineBefore }),
          ...(filters.deadlineAfter && { gte: filters.deadlineAfter }),
        }
      }
      if (filters.starred !== undefined) {
        where.starred = filters.starred
      }
      if (filters.dismissed !== undefined) {
        where.dismissed = filters.dismissed
      }
      if (filters.minScore !== undefined) {
        where.relevanceScore = { gte: filters.minScore }
      }
      if (filters.noSubmissions) {
        where.submissions = { none: { status: { in: ['SUBMITTED', 'ACCEPTED'] } } }
      }
      if (filters.search) {
        where.AND = [
          {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        ]
      }

            const orderBy: any =
        sort === 'relevance' ? { relevanceScore: 'desc' } :
        sort === 'created' ? { createdAt: 'desc' } :
        { deadline: 'asc' }

      const [competitions, count] = await Promise.all([
        db.competition.findMany({
          where,
          orderBy,
          take,
          skip,
          include: {
            _count: {
              select: { submissions: true, analyses: true },
            },
            submissions: {
              where: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
              select: { id: true },
              take: 1,
            },
            magazine: { select: { id: true, name: true } },
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
      return db.competition.findUnique({
        where: { id: input.id },
        include: {
          submissions: true,
          analyses: true,
          magazine: { select: { id: true, name: true, url: true } },
        },
      })
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

      return db.competition.update({
        where: { id: input.id },
        data: { starred: !competition.starred },
      })
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
        data: { dismissed: true, starred: false },
      })

      // Always create feedback record for tracking
      await db.userFeedback.create({
        data: {
          competitionId: input.id,
          action: 'DISMISSED',
          reason: input.reason || null,
        },
      })

      // If reason provided, extract and store dismissal pattern for AI learning
      // Skip pattern learning for "Duplikat" — it's just cleanup, not a preference signal
      if (input.reason && !input.reason.toLowerCase().includes('duplikat')) {
        const reason = input.reason.toLowerCase().trim()
        // Map common reasons to patterns
        const patternMap: Record<string, string[]> = {
          'falsches_genre': ['genre', 'lyrik', 'prosa', 'krimi', 'roman', 'haiku'],
          'zu_teuer': ['teuer', 'gebühr', 'kosten', 'geld', 'fee', 'euro', '€'],
          'zu_kurze_deadline': ['deadline', 'zeit', 'kurz', 'schnell', 'knapp'],
          'nicht_mein_thema': ['thema', 'interesse', 'passt nicht', 'nicht mein'],
          'altersbeschraenkung': ['alter', 'jung', 'jugend', 'nachwuchs'],
          'regionalbeschraenkung': ['region', 'land', 'österreich', 'schweiz', 'deutschland'],
          'qualitaet': ['unseriös', 'qualität', 'spam', 'dubios'],
        }

        for (const [pattern, keywords] of Object.entries(patternMap)) {
          if (keywords.some(kw => reason.includes(kw))) {
            await db.dismissalPattern.upsert({
              where: { pattern },
              update: { count: { increment: 1 }, keywords: { push: reason } },
              create: { pattern, keywords: [reason], count: 1 },
            })
            break
          }
        }
      }

      return updated
    }),

  getDismissalPatterns: publicProcedure.query(async () => {
    return db.dismissalPattern.findMany({
      orderBy: { count: 'desc' },
    })
  }),

  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.competition.update({
        where: { id: input.id },
        data: { dismissed: false },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        organizer: z.string().nullable().optional(),
        deadline: z.date().nullable().optional(),
        theme: z.string().nullable().optional(),
        genres: z.string().array().optional(),
        prize: z.string().nullable().optional(),
        maxLength: z.string().nullable().optional(),
        requirements: z.string().nullable().optional(),
        ageRestriction: z.string().nullable().optional(),
        regionRestriction: z.string().nullable().optional(),
        fee: z.string().nullable().optional(),
        url: z.string().optional(),
        description: z.string().nullable().optional(),
        type: z.enum(['WETTBEWERB', 'ANTHOLOGIE', 'ZEITSCHRIFT']).optional(),
        status: z.enum(['ACTIVE', 'EXPIRED', 'ARCHIVED']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return db.competition.update({
        where: { id },
        data,
      })
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

      const source = await db.source.upsert({
        where: { url: 'manual' },
        update: {},
        create: {
          name: 'Manual',
          url: 'manual',
          type: 'MANUAL',
        },
      })

      return db.competition.create({
        data: {
          name: competitionData.name,
          description: competitionData.description,
          organizer: competitionData.organizer,
          deadline: competitionData.deadline,
          url: competitionData.url,
          type: competitionData.type as any,
          source: { connect: { id: source.id } },
          genres: genres || [],
        },
      })
    }),
})
