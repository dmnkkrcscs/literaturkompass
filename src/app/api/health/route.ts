import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'error', detail: 'db unreachable' }, { status: 503 })
  }
}
