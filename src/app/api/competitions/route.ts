import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const type = searchParams.get('type') || undefined
    const hasDeadline = searchParams.get('hasDeadline') === 'true'
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const take = parseInt(searchParams.get('take') || '10', 10)

    const where: any = {
      dismissed: false,
      status: 'ACTIVE',
    }

    // Apply filters
    if (type && type !== 'ALL') {
      where.type = type
    }

    if (hasDeadline) {
      where.deadline = { not: null }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { organizer: { contains: search, mode: 'insensitive' } },
      ]
    }

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
          maxLength: true,
          url: true,
          genres: true,
        },
        orderBy: { deadline: 'asc' },
        take,
        skip,
      }),
      db.competition.count({ where }),
    ])

    return NextResponse.json({
      competitions,
      hasMore: skip + take < count,
      total: count,
    })
  } catch (error) {
    console.error('Failed to fetch competitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    )
  }
}
