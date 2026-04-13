import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const sources = await db.source.findMany({
      include: { _count: { select: { competitions: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('GET /api/sources error:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, url } = body
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }
    const source = await db.source.create({
      data: { name, url, type: 'AGGREGATOR', isActive: true },
    })
    return NextResponse.json({ source }, { status: 201 })
  } catch (error) {
    console.error('POST /api/sources error:', error)
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
  }
}
