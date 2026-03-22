import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const sourceRouter = router({
  list: publicProcedure.query(async () => {
    const sources = await db.source.findMany({
      include: {
        _count: {
          select: { competitions: true },
        },
      },
    })

    return sources
  }),

  add: publicProcedure
    .input(
      z.object({
        name: z.string(),
        baseUrl: z.string().url(),
        adapter: z.string(),
        adapterConfig: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const source = await db.source.create({
        data: {
          name: input.name,
          baseUrl: input.baseUrl,
          adapter: input.adapter,
          adapterConfig: input.adapterConfig || {},
          isActive: true,
        },
      })

      return source
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean().optional(),
        adapterConfig: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data: any = {}

      if (input.isActive !== undefined) {
        data.isActive = input.isActive
      }
      if (input.adapterConfig !== undefined) {
        data.adapterConfig = input.adapterConfig
      }

      const source = await db.source.update({
        where: { id: input.id },
        data,
      })

      return source
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const source = await db.source.update({
        where: { id: input.id },
        data: { isActive: false },
      })

      return source
    }),
})
