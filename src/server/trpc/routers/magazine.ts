import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const magazineRouter = router({
  list: publicProcedure.query(async () => {
    const magazines = await db.magazine.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { issues: true } },
        issues: {
          where: { status: 'ACTIVE', deadline: { gt: new Date() } },
          orderBy: { deadline: 'asc' },
          select: {
            id: true,
            name: true,
            theme: true,
            deadline: true,
            starred: true,
            dismissed: true,
            submissions: {
              where: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
              select: { id: true, status: true },
              take: 1,
            },
          },
        },
      },
    })
    return magazines
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.magazine.findUnique({
        where: { id: input.id },
        include: {
          issues: {
            orderBy: { deadline: 'asc' },
            select: {
              id: true,
              name: true,
              theme: true,
              deadline: true,
              status: true,
              starred: true,
              dismissed: true,
              submissions: {
                select: { id: true, status: true, title: true },
              },
            },
          },
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        location: z.string().optional(),
        description: z.string().optional(),
        genres: z.string().array().optional(),
        requirements: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.magazine.create({
        data: {
          name: input.name,
          url: input.url,
          location: input.location,
          description: input.description,
          genres: input.genres || [],
          requirements: input.requirements,
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        url: z.string().url().optional(),
        location: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        genres: z.string().array().optional(),
        requirements: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return db.magazine.update({ where: { id }, data })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.magazine.delete({ where: { id: input.id } })
    }),

  addIssue: publicProcedure
    .input(
      z.object({
        magazineId: z.string(),
        theme: z.string().min(1),
        deadline: z.coerce.date(),
        requirements: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const magazine = await db.magazine.findUniqueOrThrow({
        where: { id: input.magazineId },
      })

      // Ensure manual source exists
      const source = await db.source.upsert({
        where: { url: 'manual' },
        update: {},
        create: { name: 'Manual', url: 'manual', type: 'MANUAL' },
      })

      const dateStr = input.deadline.toISOString().split('T')[0]
      const issueUrl = `${magazine.url}#${dateStr}`
      const issueName = `${magazine.name} – ${input.theme}`

      // Check for duplicate URL (same magazine + same deadline date)
      const existing = await db.competition.findUnique({ where: { url: issueUrl } })
      if (existing) {
        throw new Error(`Ausgabe für dieses Datum existiert bereits: ${issueName}`)
      }

      return db.competition.create({
        data: {
          type: 'ZEITSCHRIFT',
          name: issueName,
          organizer: magazine.name,
          theme: input.theme,
          deadline: input.deadline,
          url: issueUrl,
          genres: magazine.genres,
          requirements: input.requirements || magazine.requirements,
          source: { connect: { id: source.id } },
          magazine: { connect: { id: magazine.id } },
        },
      })
    }),
})
