import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const starred = body.starred !== undefined ? Boolean(body.starred) : undefined

    const competition = await db.competition.findUnique({ where: { id } })
    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    const newStarred = starred !== undefined ? starred : !competition.starred

    await db.competition.update({
      where: { id },
      data: {
        starred: newStarred,
        starredAt: newStarred ? new Date() : null,
      },
    })

    return NextResponse.json({ starred: newStarred })
  } catch (error) {
    console.error('Failed to star competition:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
