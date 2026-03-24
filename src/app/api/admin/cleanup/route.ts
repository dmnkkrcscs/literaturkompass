import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/cleanup
 *
 * Deletes expired competitions that the user hasn't engaged with:
 *   - deadline is in the past
 *   - not starred
 *   - no submissions linked (planned/submitted/etc.)
 *
 * Safe to call repeatedly — idempotent.
 * Also marks past-deadline competitions as EXPIRED status regardless.
 */
export async function POST() {
  try {
    const now = new Date()

    // 1. Mark all past-deadline competitions as EXPIRED (keeps starred ones visible but flagged)
    const { count: markedExpired } = await db.competition.updateMany({
      where: {
        deadline: { lt: now },
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRED' },
    })

    // 2. Hard-delete expired competitions that are:
    //    - not starred
    //    - have no submissions at all
    const toDelete = await db.competition.findMany({
      where: {
        deadline: { lt: now },
        starred: false,
        submissions: { none: {} },
      },
      select: { id: true, name: true, deadline: true },
    })

    if (toDelete.length > 0) {
      await db.competition.deleteMany({
        where: {
          id: { in: toDelete.map((c) => c.id) },
        },
      })
    }

    return NextResponse.json({
      success: true,
      markedExpired,
      deleted: toDelete.length,
      deletedNames: toDelete.map((c) => c.name),
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup
 *
 * Preview: shows what would be deleted without actually deleting.
 */
export async function GET() {
  try {
    const now = new Date()

    const expired = await db.competition.findMany({
      where: {
        deadline: { lt: now },
        starred: false,
        submissions: { none: {} },
      },
      select: { id: true, name: true, deadline: true, organizer: true },
      orderBy: { deadline: 'asc' },
    })

    return NextResponse.json({
      wouldDelete: expired.length,
      competitions: expired,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
