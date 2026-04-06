import { z } from 'zod'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { publicProcedure, router } from '../init'

export const submissionRouter = router({
  // List submissions with optional filters
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['PLANNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
        competitionId: z.string().optional(),
        take: z.number().int().default(50),
        skip: z.number().int().default(0),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.SubmissionWhereInput = {
        ...(input.status && { status: input.status }),
        ...(input.competitionId && { competitionId: input.competitionId }),
      }

      const [submissions, count] = await Promise.all([
        db.submission.findMany({
          where,
          include: {
            competition: {
              select: {
                id: true,
                name: true,
                deadline: true,
                type: true,
                organizer: true,
                url: true,
              },
            },
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

  // List open submissions (SUBMITTED, waiting for response)
  listOpen: publicProcedure.query(async () => {
    return db.submission.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            deadline: true,
            type: true,
            organizer: true,
            url: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    })
  }),

  // Create a basic submission (PLANNED status)
  create: publicProcedure
    .input(
      z.object({
        competitionId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.submission.create({
        data: {
          competitionId: input.competitionId,
          title: input.title,
          status: 'PLANNED',
        },
        include: {
          competition: {
            select: { id: true, name: true, deadline: true, type: true },
          },
        },
      })
    }),

  // Submit: Record that user has submitted to a competition
  // Creates submission with SUBMITTED status and un-stars the competition
  submit: publicProcedure
    .input(
      z.object({
        competitionId: z.string(),
        title: z.string(),
        submittedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [submission] = await Promise.all([
        db.submission.create({
          data: {
            competitionId: input.competitionId,
            title: input.title,
            status: 'SUBMITTED',
            submittedAt: input.submittedAt || new Date(),
          },
          include: {
            competition: {
              select: { id: true, name: true, deadline: true, type: true },
            },
          },
        }),
        // Un-star the competition after submitting
        db.competition.update({
          where: { id: input.competitionId },
          data: { starred: false },
        }),
      ])

      return submission
    }),

  // Mark result: Zusage or Absage
  markResult: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['ACCEPTED', 'REJECTED']),
        responseAt: z.date().optional(),
        publishedUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.submission.update({
        where: { id: input.id },
        data: {
          status: input.status,
          responseAt: input.responseAt || new Date(),
          ...(input.publishedUrl && { publishedUrl: input.publishedUrl }),
        },
        include: {
          competition: {
            select: { id: true, name: true, deadline: true, type: true },
          },
        },
      })
    }),

  // General update for editing any submission fields
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        notes: z.string().nullable().optional(),
        textContent: z.string().nullable().optional(),
        submittedAt: z.date().nullable().optional(),
        responseAt: z.date().nullable().optional(),
        publishedUrl: z.string().nullable().optional(),
        status: z.enum(['PLANNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return db.submission.update({
        where: { id },
        data,
        include: {
          competition: {
            select: { id: true, name: true, deadline: true, type: true },
          },
        },
      })
    }),

  // Legacy: update status only
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PLANNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']),
      })
    )
    .mutation(async ({ input }) => {
      return db.submission.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          competition: {
            select: { id: true, name: true, deadline: true, type: true },
          },
        },
      })
    }),
})
