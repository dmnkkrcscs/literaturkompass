import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST – mark a competition as "vorgemerkt" (creates PLANNED submission)
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const competition = await db.competition.findUnique({ where: { id } })
    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check if a submission already exists for this competition
    const existing = await db.submission.findFirst({ where: { competitionId: id } })
    if (existing) {
      return NextResponse.json({ submission: existing, alreadyExists: true })
    }

    // Create new PLANNED submission
    const submission = await db.submission.create({
      data: {
        competitionId: id,
        status: 'PLANNED',
      },
    })

    // Also star the competition
    await db.competition.update({
      where: { id },
      data: { starred: true, starredAt: new Date() },
    })

    return NextResponse.json({ submission, alreadyExists: false })
  } catch (error) {
    console.error('Failed to plan competition:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

// DELETE – remove from plan (delete PLANNED submission)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const submission = await db.submission.findFirst({
      where: { competitionId: id, status: 'PLANNED' },
    })
    if (submission) {
      await db.submission.delete({ where: { id: submission.id } })
    }
    await db.competition.update({
      where: { id },
      data: { starred: false, starredAt: null },
    })
    return NextResponse.json({ removed: true })
  } catch (error) {
    console.error('Failed to remove from plan:', error)
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  }
}
