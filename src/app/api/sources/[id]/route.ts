import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { isActive } = body

    const source = await db.source.update({
      where: { id: params.id },
      data: { isActive },
    })

    return NextResponse.json({ source })
  } catch (error) {
    console.error('PATCH /api/sources/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.source.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/sources/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 })
  }
}
