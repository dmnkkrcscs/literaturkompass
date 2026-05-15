import { describe, it, expect } from 'vitest'
import { buildCompetitionWhere } from './filter'

const TODAY = new Date('2026-05-15T00:00:00Z')

describe('buildCompetitionWhere — Grundfilter', () => {
  it('setzt dismissed:false und status:ACTIVE immer', () => {
    const where = buildCompetitionWhere({ today: TODAY })
    expect(where.dismissed).toBe(false)
    expect(where.status).toBe('ACTIVE')
  })

  it('schließt Magazin-Wurzeleinträge (ZEITSCHRIFT ohne Thema) aus', () => {
    const where = buildCompetitionWhere({ today: TODAY })
    expect(where.NOT).toEqual({
      AND: [
        { type: 'ZEITSCHRIFT' },
        { theme: null },
      ],
    })
  })

  it('enthält immer den Deadline-OR-Block (aktiv / null / starred)', () => {
    const where = buildCompetitionWhere({ today: TODAY })
    const deadlineBlock = (where.AND as any[])[0]
    expect(deadlineBlock.OR).toHaveLength(3)
    expect(deadlineBlock.OR[0]).toEqual({ deadline: { gte: TODAY } })
    expect(deadlineBlock.OR[1]).toEqual({ deadline: null })
    expect(deadlineBlock.OR[2]).toEqual({ starred: true })
  })
})

describe('buildCompetitionWhere — showSubmitted', () => {
  it('versteckt eingereichte Wettbewerbe standardmäßig (showSubmitted=false)', () => {
    const where = buildCompetitionWhere({ today: TODAY, showSubmitted: false })
    expect(where.submissions).toEqual({
      none: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
    })
  })

  it('zeigt eingereichte Wettbewerbe wenn showSubmitted=true', () => {
    const where = buildCompetitionWhere({ today: TODAY, showSubmitted: true })
    expect(where.submissions).toBeUndefined()
  })
})

describe('buildCompetitionWhere — Typ-Filter', () => {
  it('setzt type-Filter wenn ein spezifischer Typ gewählt wird', () => {
    const where = buildCompetitionWhere({ today: TODAY, type: 'ANTHOLOGIE' })
    expect(where.type).toBe('ANTHOLOGIE')
  })

  it('ignoriert Typ-Filter bei "ALL"', () => {
    const where = buildCompetitionWhere({ today: TODAY, type: 'ALL' })
    expect(where.type).toBeUndefined()
  })

  it('ignoriert Typ-Filter wenn undefined', () => {
    const where = buildCompetitionWhere({ today: TODAY })
    expect(where.type).toBeUndefined()
  })
})

describe('buildCompetitionWhere — hasDeadline-Filter', () => {
  it('schränkt auf Wettbewerbe mit Deadline ein wenn hasDeadline=true', () => {
    const where = buildCompetitionWhere({ today: TODAY, hasDeadline: true })
    expect(where.deadline).toEqual({ not: null })
  })

  it('setzt kein deadline-Filter wenn hasDeadline=false', () => {
    const where = buildCompetitionWhere({ today: TODAY, hasDeadline: false })
    expect(where.deadline).toBeUndefined()
  })
})

describe('buildCompetitionWhere — Suche', () => {
  it('fügt Suchfilter in AND ein wenn search gesetzt ist', () => {
    const where = buildCompetitionWhere({ today: TODAY, search: 'Lyrik' })
    const andBlocks = where.AND as any[]
    const searchBlock = andBlocks[1]
    expect(searchBlock).toBeDefined()
    expect(searchBlock.OR).toEqual([
      { name: { contains: 'Lyrik', mode: 'insensitive' } },
      { description: { contains: 'Lyrik', mode: 'insensitive' } },
      { organizer: { contains: 'Lyrik', mode: 'insensitive' } },
    ])
  })

  it('fügt keinen Suchfilter hinzu wenn search leer ist', () => {
    const where = buildCompetitionWhere({ today: TODAY })
    expect((where.AND as any[]).length).toBe(1) // nur der Deadline-Block
  })
})

describe('buildCompetitionWhere — Kombination', () => {
  it('kombiniert alle Filter korrekt', () => {
    const where = buildCompetitionWhere({
      today: TODAY,
      search: 'Roman',
      type: 'WETTBEWERB',
      hasDeadline: true,
      showSubmitted: true,
    })
    expect(where.type).toBe('WETTBEWERB')
    expect(where.deadline).toEqual({ not: null })
    expect(where.submissions).toBeUndefined()
    expect((where.AND as any[]).length).toBe(2) // Deadline-Block + Suchblock
  })
})
