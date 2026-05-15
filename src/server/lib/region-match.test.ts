import { describe, it, expect } from 'vitest'
import { regionMatches } from './region-match'

describe('regionMatches — keine Restriction', () => {
  it('passt immer wenn Restriction null ist', () => {
    expect(regionMatches(null, ['Deutschland'])).toBe(true)
  })

  it('passt immer wenn Restriction leer ist', () => {
    expect(regionMatches('', ['Deutschland'])).toBe(true)
  })

  it('passt immer wenn Restriction nur Whitespace ist', () => {
    expect(regionMatches('   ', ['Deutschland'])).toBe(true)
  })
})

describe('regionMatches — kein User-Profil', () => {
  it('passt immer wenn allowedRegions leer ist', () => {
    expect(regionMatches('Nur für Bayern', [])).toBe(true)
  })
})

describe('regionMatches — Substring-Match', () => {
  it('trifft exakten Match', () => {
    expect(regionMatches('Österreich', ['Österreich'])).toBe(true)
  })

  it('trifft wenn Restriction die Region als Substring enthält', () => {
    expect(regionMatches('Deutschland, Österreich, Schweiz', ['Österreich'])).toBe(true)
  })

  it('ist case-insensitiv', () => {
    expect(regionMatches('deutschland', ['Deutschland'])).toBe(true)
    expect(regionMatches('ÖSTERREICH', ['österreich'])).toBe(true)
  })

  it('passt wenn eine von mehreren erlaubten Regionen matcht', () => {
    expect(regionMatches('Nur für Bayern', ['Berlin', 'Bayern'])).toBe(true)
  })

  it('trifft bei freiformulierten Restrictions', () => {
    expect(regionMatches('Aufgewachsen in Niederösterreich', ['Österreich'])).toBe(true)
  })
})

describe('regionMatches — kein Match', () => {
  it('schlägt fehl wenn keine erlaubte Region in der Restriction vorkommt', () => {
    expect(regionMatches('Nur für Bayern', ['Berlin'])).toBe(false)
  })

  it('schlägt fehl wenn alle Regionen fehlen', () => {
    expect(regionMatches('Schweiz und Österreich', ['Deutschland', 'Berlin'])).toBe(false)
  })

  it('ignoriert Regionen die nur Whitespace sind', () => {
    expect(regionMatches('Bayern', ['  '])).toBe(false)
  })
})
