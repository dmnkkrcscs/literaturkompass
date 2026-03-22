import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

export const statsRouter = router({
  dashboard: publicProcedure.query(async () => {
    const now = new Date()

    const [totalCompetitions, competitionsByType, openDeadlines, starredCount, submittedCount, acceptedCount] =
      await Promise.all([
        db.competition.count({
          where: { dismissed: false },
        }),
        db.competition.groupBy({
          by: ['type'],
          where: { dismissed: false },
          _count: true,
        }),
        db.competition.count({
          where: {
            dismissed: false,
            deadline: {
              gte: now,
            },
          },
        }),
        db.competition.count({
          where: {
            starred: true,
            dismissed: false,
          },
        }),
        db.submission.count({
          where: {
            status: 'SUBMITTED',
          },
        }),
        db.submission.count({
          where: {
            status: 'ACCEPTED',
          },
        }),
      ])

    return {
      total: totalCompetitions,
      byType: competitionsByType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      openDeadlines,
      starred: starredCount,
      submitted: submittedCount,
      accepted: acceptedCount,
      timestamp: new Date(),
    }
  }),

  submissions: publicProcedure.query(async () => {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())

    // Group submissions by month
    const byMonth = await db.submission.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    })

    // Calculate success rate
    const totalSubmissions = await db.submission.count()
    const acceptedSubmissions = await db.submission.count({
      where: { status: 'ACCEPTED' },
    })
    const successRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0

    // Group by genre
    const byGenre = await db.submission.findMany({
      where: {},
      include: {
        competition: {
          select: {
            genres: {
              select: { name: true },
            },
          },
        },
      },
    })

    const genreMap: Record<string, number> = {}
    byGenre.forEach((submission) => {
      submission.competition.genres.forEach((genre) => {
        genreMap[genre.name] = (genreMap[genre.name] || 0) + 1
      })
    })

    const genreStats = Object.entries(genreMap).map(([name, count]) => ({
      genre: name,
      count,
    }))

    return {
      byMonth: byMonth.map((item) => ({
        month: item.createdAt,
        count: item._count,
      })),
      successRate,
      acceptedCount: acceptedSubmissions,
      totalCount: totalSubmissions,
      byGenre: genreStats,
      timestamp: new Date(),
    }
  }),
})
