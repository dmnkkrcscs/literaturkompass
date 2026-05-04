import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'
import { regionMatches } from '@/server/lib/region-match'

const SINGLETON_ID = 'default'

const profileInputSchema = z.object({
  age: z.number().int().min(0).max(150).nullable(),
  allowedRegions: z.array(z.string().trim().min(1)).max(50),
})

export const userProfileRouter = router({
  get: publicProcedure.query(async () => {
    return db.userProfile.findFirst()
  }),

  upsert: publicProcedure
    .input(profileInputSchema)
    .mutation(async ({ input }) => {
      const existing = await db.userProfile.findFirst()
      const profile = existing
        ? await db.userProfile.update({
            where: { id: existing.id },
            data: { age: input.age, allowedRegions: input.allowedRegions },
          })
        : await db.userProfile.create({
            data: {
              id: SINGLETON_ID,
              age: input.age,
              allowedRegions: input.allowedRegions,
            },
          })

      // Retroaktiv: alle aktiven Wettbewerbe durchgehen, deren Restriction
      // mit dem neuen Profil unvereinbar ist, auf dismissed setzen.
      // Geplante (starred) Wettbewerbe werden bewusst NICHT angefasst —
      // wenn der User die explizit gestartet hat, soll sich das Profil-
      // Update nicht in seine Planung einmischen.
      if (profile.allowedRegions.length > 0) {
        const candidates = await db.competition.findMany({
          where: {
            dismissed: false,
            starred: false,
            regionRestriction: { not: null },
          },
          select: { id: true, regionRestriction: true },
        })
        const idsToDismiss = candidates
          .filter(c => !regionMatches(c.regionRestriction, profile.allowedRegions))
          .map(c => c.id)
        if (idsToDismiss.length > 0) {
          await db.competition.updateMany({
            where: { id: { in: idsToDismiss } },
            data: { dismissed: true },
          })
        }
        return { profile, retroactivelyDismissed: idsToDismiss.length }
      }

      return { profile, retroactivelyDismissed: 0 }
    }),
})
