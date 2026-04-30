import { z } from 'zod'
import { publicProcedure, router } from '../init'
import { generateDashboardMessage } from '@/server/ai/dashboard-message'
import { generateRecommendations, type AiRecommendation } from '@/server/ai/recommendations'
import { createMemoryCache } from '@/lib/utils'
import { assessForTriage } from '@/server/ai/triage-assess'

const messageCache = createMemoryCache<string>(6 * 60 * 60 * 1000) // 6h
const recoCache = createMemoryCache<AiRecommendation[]>(60 * 60 * 1000) // 1h

const FALLBACK_MESSAGE = 'Schreib weiter – jede Zeile zählt.'
const AI_TIMEOUT_MS = 20_000 // 20s max for AI operations

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI operation timed out')), ms)
    ),
  ])
}

export const aiRouter = router({
  dashboardMessage: publicProcedure.query(async () => {
    const cached = messageCache.get()
    if (cached) return { message: cached, cached: true }

    try {
      const message = await withTimeout(generateDashboardMessage(), AI_TIMEOUT_MS)
      messageCache.set(message)
      return { message, cached: false }
    } catch (error) {
      console.error('Dashboard message generation failed:', error)
      return { message: FALLBACK_MESSAGE, cached: false }
    }
  }),

  refreshDashboardMessage: publicProcedure.mutation(async () => {
    try {
      const message = await withTimeout(generateDashboardMessage(), AI_TIMEOUT_MS)
      messageCache.set(message)
      return { message }
    } catch (error) {
      console.error('Dashboard message refresh failed:', error)
      return { message: FALLBACK_MESSAGE }
    }
  }),

  recommendations: publicProcedure.query(async () => {
    const cached = recoCache.get()
    if (cached) return { recommendations: cached, cached: true }

    try {
      const recommendations = await withTimeout(generateRecommendations(), AI_TIMEOUT_MS)
      recoCache.set(recommendations)
      return { recommendations, cached: false }
    } catch (error) {
      console.error('Recommendations generation failed:', error)
      return { recommendations: [], cached: false }
    }
  }),

  refreshRecommendations: publicProcedure.mutation(async () => {
    try {
      const recommendations = await withTimeout(generateRecommendations(), AI_TIMEOUT_MS)
      recoCache.set(recommendations)
      return { recommendations }
    } catch (error) {
      console.error('Recommendations refresh failed:', error)
      return { recommendations: [] }
    }
  }),

  triageAssess: publicProcedure
    .input(z.object({ competitionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await withTimeout(assessForTriage(input.competitionId), AI_TIMEOUT_MS)
      } catch (error) {
        console.error('Triage assess failed:', error)
        return { score: null, reason: null }
      }
    }),
})
