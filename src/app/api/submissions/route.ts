import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const submissions = await db.submission.findMany({
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            organizer: true,
            deadline: true,
            type: true,
            theme: true,
            url: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    })
    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { competitionId, titel, thema, publikation, submittedAt } = body

    if (!competitionId) {
      return NextResponse.json({ error: 'competitionId is required' }, { status: 400 })
    }

    const parts: string[] = []
    if (titel) parts.push(`Titel: ${titel}`)
    if (thema) parts.push(`Thema: ${thema}`)
    if (publikation) parts.push(`Publikation: ${publikation}`)
    const notes = parts.length > 0 ? parts.join(' | ') : null

    const submission = await db.submission.create({
      data: {
        competitionId,
        status: 'SUBMITTED',
        notes,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      },
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Failed to create submission:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
