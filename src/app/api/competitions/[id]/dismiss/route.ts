import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.competition.update({
      where: { id },
      data: { dismissed: true },
    })
    return NextResponse.json({ dismissed: true })
  } catch (error) {
    console.error('Failed to dismiss competition:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
