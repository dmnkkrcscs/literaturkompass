import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'
import { generateDashboardMessage } from '@/server/ai/dashboard-message'
import { generateRecommendations } from '@/server/ai/recommendations'

// Simple in-memory cache for dashboard message (6 hours)
let cachedMessage: { text: string; timestamp: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000

// Cache for recommendations (1 hour)
let cachedRecommendations: { data: any[]; timestamp: number } | null = null
const RECO_CACHE_TTL = 60 * 60 * 1000

export const aiRouter = router({
  dashboardMessage: publicProcedure.query(async () => {
    if (cachedMessage && Date.now() - cachedMessage.timestamp < CACHE_TTL) {
      return { message: cachedMessage.text, cached: true }
    }

    const message = await generateDashboardMessage()
    cachedMessage = { text: message, timestamp: Date.now() }
    return { message, cached: false }
  }),

  refreshDashboardMessage: publicProcedure.mutation(async () => {
    const message = await generateDashboardMessage()
    cachedMessage = { text: message, timestamp: Date.now() }
    return { message }
  }),

  recommendations: publicProcedure.query(async () => {
    if (cachedRecommendations && Date.now() - cachedRecommendations.timestamp < RECO_CACHE_TTL) {
      return { recommendations: cachedRecommendations.data, cached: true }
    }

    const recommendations = await generateRecommendations()
    cachedRecommendations = { data: recommendations, timestamp: Date.now() }
    return { recommendations, cached: false }
  }),

  refreshRecommendations: publicProcedure.mutation(async () => {
    const recommendations = await generateRecommendations()
    cachedRecommendations = { data: recommendations, timestamp: Date.now() }
    return { recommendations }
  }),
})
