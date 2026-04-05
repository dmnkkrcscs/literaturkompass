import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const sourceRouter = router({
  list: publicProcedure.query(async () => {
    return db.source.findMany({
      include: {
        _count: {
          select: { competitions: true },
        },
      },
    })
  }),

  add: publicProcedure
    .input(
      z.object({
        name: z.string(),
        url: z.string().url(),
        adapter: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.source.create({
        data: {
          name: input.name,
          url: input.url,
          type: 'AGGREGATOR',
          adapter: input.adapter,
          isActive: true,
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean().optional(),
        adapter: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.source.update({
        where: { id: input.id },
        data: {
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.adapter !== undefined && { adapter: input.adapter }),
        },
      })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.source.update({
        where: { id: input.id },
        data: { isActive: false },
      })
    }),
})
