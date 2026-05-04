import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'
import { excludeMagazineRoots } from '@/server/lib/competition-filters'

export const statsRouter = router({
  dashboard: publicProcedure.query(async () => {
    const now = new Date()

    const [totalCompetitions, competitionsByType, openDeadlines, starredCount, submittedCount, acceptedCount] =
      await Promise.all([
        db.competition.count({
          where: { dismissed: false, ...excludeMagazineRoots },
        }),
        db.competition.groupBy({
          by: ['type'],
          where: { dismissed: false, ...excludeMagazineRoots },
          _count: true,
        }),
        db.competition.count({
          where: {
            dismissed: false,
            deadline: {
              gte: now,
            },
            ...excludeMagazineRoots,
          },
        }),
        db.competition.count({
          where: {
            starred: true,
            dismissed: false,
            ...excludeMagazineRoots,
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
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Use raw SQL for proper monthly grouping and genre counting
    const [byMonthRaw, totalSubmissions, acceptedSubmissions, byGenreRaw] = await Promise.all([
      // Group by month using DATE_TRUNC at DB level
      db.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*)::bigint as count
        FROM "Submission"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      db.submission.count(),
      db.submission.count({ where: { status: 'ACCEPTED' } }),
      // Count submissions by genre using UNNEST at DB level
      db.$queryRaw<Array<{ genre: string; count: bigint }>>`
        SELECT g as genre, COUNT(*)::bigint as count
        FROM "Submission" s
        JOIN "Competition" c ON s."competitionId" = c.id
        CROSS JOIN UNNEST(c.genres) AS g
        GROUP BY g
        ORDER BY count DESC
      `,
    ])

    const successRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0

    return {
      byMonth: byMonthRaw.map((item) => ({
        month: item.month,
        count: Number(item.count),
      })),
      successRate,
      acceptedCount: acceptedSubmissions,
      totalCount: totalSubmissions,
      byGenre: byGenreRaw.map((item) => ({
        genre: item.genre,
        count: Number(item.count),
      })),
      timestamp: new Date(),
    }
  }),
})
