import { publicProcedure, router } from '../init'
import { generateDashboardMessage } from '@/server/ai/dashboard-message'
import { generateRecommendations, type AiRecommendation } from '@/server/ai/recommendations'
import { createMemoryCache } from '@/lib/utils'

const messageCache = createMemoryCache<string>(6 * 60 * 60 * 1000) // 6h
const recoCache = createMemoryCache<AiRecommendation[]>(60 * 60 * 1000) // 1h

export const aiRouter = router({
  dashboardMessage: publicProcedure.query(async () => {
    const cached = messageCache.get()
    if (cached) return { message: cached, cached: true }

    const message = await generateDashboardMessage()
    messageCache.set(message)
    return { message, cached: false }
  }),

  refreshDashboardMessage: publicProcedure.mutation(async () => {
    const message = await generateDashboardMessage()
    messageCache.set(message)
    return { message }
  }),

  recommendations: publicProcedure.query(async () => {
    const cached = recoCache.get()
    if (cached) return { recommendations: cached, cached: true }

    const recommendations = await generateRecommendations()
    recoCache.set(recommendations)
    return { recommendations, cached: false }
  }),

  refreshRecommendations: publicProcedure.mutation(async () => {
    const recommendations = await generateRecommendations()
    recoCache.set(recommendations)
    return { recommendations }
  }),
})
