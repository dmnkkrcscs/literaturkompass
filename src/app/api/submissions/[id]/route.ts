import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PATCH – update submission status/notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status, titel, thema, publikation, notes: rawNotes, responseAt } = body

    const submission = await db.submission.findUnique({ where: { id } })
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Build notes from fields if provided
    let notes: string | undefined = rawNotes
    if (titel !== undefined || thema !== undefined || publikation !== undefined) {
      // Parse existing notes to preserve unreplaced fields
      const existing = parseNotes(submission.notes)
      const t = titel !== undefined ? titel : existing.titel
      const th = thema !== undefined ? thema : existing.thema
      const pub = publikation !== undefined ? publikation : existing.publikation
      const parts: string[] = []
      if (t) parts.push(`Titel: ${t}`)
      if (th) parts.push(`Thema: ${th}`)
      if (pub) parts.push(`Publikation: ${pub}`)
      notes = parts.join(' | ') || undefined
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      data.status = status
      if (status === 'SUBMITTED' && !submission.submittedAt) {
        data.submittedAt = new Date()
      }
      if ((status === 'ACCEPTED' || status === 'REJECTED') && !submission.responseAt) {
        data.responseAt = responseAt ? new Date(responseAt) : new Date()
      }
    }
    if (notes !== undefined) data.notes = notes

    const updated = await db.submission.update({ where: { id }, data })
    return NextResponse.json({ submission: updated })
  } catch (error) {
    console.error('Failed to update submission:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE – delete a submission
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.submission.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Failed to delete submission:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

function parseNotes(notes: string | null): { titel?: string; thema?: string; publikation?: string } {
  if (!notes) return {}
  const result: Record<string, string> = {}
  notes.split('|').forEach((part) => {
    const colonIdx = part.indexOf(':')
    if (colonIdx === -1) return
    const key = part.slice(0, colonIdx).trim().toLowerCase()
    const value = part.slice(colonIdx + 1).trim()
    if (key === 'titel') result.titel = value
    else if (key === 'thema') result.thema = value
    else if (key === 'publikation') result.publikation = value
  })
  return result
}
