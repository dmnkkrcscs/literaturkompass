import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'
import { generateDashboardMessage } from '@/server/ai/dashboard-message'

// Simple in-memory cache for dashboard message (6 hours)
let cachedMessage: { text: string; timestamp: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export const aiRouter = router({
  dashboardMessage: publicProcedure.query(async () => {
    // Return cached message if still fresh
    if (cachedMessage && Date.now() - cachedMessage.timestamp < CACHE_TTL) {
      return { message: cachedMessage.text, cached: true }
    }

    const message = await generateDashboardMessage()
    cachedMessage = { text: message, timestamp: Date.now() }

    return { message, cached: false }
  }),

  // Force refresh dashboard message
  refreshDashboardMessage: publicProcedure.mutation(async () => {
    const message = await generateDashboardMessage()
    cachedMessage = { text: message, timestamp: Date.now() }
    return { message }
  }),

  recommendations: publicProcedure.query(async () => {
    const competitions = await db.competition.findMany({
      where: {
        dismissed: false,
        status: 'ACTIVE',
      },
      orderBy: {
        relevanceScore: 'desc',
      },
      take: 10,
    })

    return {
      recommendations: competitions,
      timestamp: new Date(),
    }
  }),
})
