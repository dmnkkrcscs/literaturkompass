import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { buildCompetitionWhere } from './filter'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const hasDeadline = searchParams.get('hasDeadline') === 'true'
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const take = parseInt(searchParams.get('take') || '10', 10)
    const showSubmitted = searchParams.get('showSubmitted') === 'true'

    const where = buildCompetitionWhere({ search, type, hasDeadline, showSubmitted })

    const [competitions, count] = await Promise.all([
      db.competition.findMany({
        where,
        select: {
          id: true,
          name: true,
          organizer: true,
          deadline: true,
          type: true,
          theme: true,
          prize: true,
          genres: true,
          submissions: {
            where: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
            select: { id: true },
            take: 1,
          },
          magazine: { select: { id: true, name: true } },
        },
        orderBy: { deadline: 'asc' },
        take,
        skip,
      }),
      db.competition.count({ where }),
    ])

    const response = NextResponse.json({
      competitions,
      hasMore: skip + take < count,
      total: count,
    })
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Failed to fetch competitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    )
  }
}
