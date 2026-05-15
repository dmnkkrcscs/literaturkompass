import { describe, it, expect } from 'vitest'
import { ExtractionResponseSchema } from './schemas'

const BASE_DATA = {
  name: 'Lyrikpreis Test',
  type: 'poetry',
  organizer: 'Testverlag',
  deadline: '2026-12-31',
  genres: ['Lyrik'],
  relevanceScore: 80,
}

describe('ExtractionResponseSchema — relevant:false', () => {
  it('validiert eine nicht-relevante Seite ohne data', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: false,
      confidence: 0.1,
      reason: 'Keine Ausschreibung gefunden.',
    })
    expect(result.relevant).toBe(false)
    expect(result.data).toBeUndefined()
  })
})

describe('ExtractionResponseSchema — type-Fallback', () => {
  it('fällt bei unbekanntem type auf "mixed" zurück (statt Exception)', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, type: 'short_story' },
    })
    expect(result.data?.type).toBe('mixed')
  })

  it('akzeptiert bekannte type-Werte unverändert', () => {
    for (const t of ['text', 'poetry', 'drama', 'mixed'] as const) {
      const result = ExtractionResponseSchema.parse({
        relevant: true,
        confidence: 0.9,
        data: { ...BASE_DATA, type: t },
      })
      expect(result.data?.type).toBe(t)
    }
  })
})

describe('ExtractionResponseSchema — genres-Transform', () => {
  it('akzeptiert genres als Array', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, genres: ['Lyrik', 'Prosa'] },
    })
    expect(result.data?.genres).toEqual(['Lyrik', 'Prosa'])
  })

  it('splittet genres-String per Komma', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, genres: 'Lyrik, Prosa, Kurzgeschichte' },
    })
    expect(result.data?.genres).toEqual(['Lyrik', 'Prosa', 'Kurzgeschichte'])
  })

  it('splittet genres-String per Semikolon', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, genres: 'Lyrik;Prosa' },
    })
    expect(result.data?.genres).toEqual(['Lyrik', 'Prosa'])
  })

  it('filtert leere Einträge nach Split heraus', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, genres: 'Lyrik,,Prosa' },
    })
    expect(result.data?.genres).toEqual(['Lyrik', 'Prosa'])
  })
})

describe('ExtractionResponseSchema — maxLength-Transform', () => {
  it('akzeptiert maxLength als Zahl', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, maxLength: 5000 },
    })
    expect(result.data?.maxLength).toBe(5000)
  })

  it('parst maxLength aus String (Ziffern extrahieren)', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, maxLength: 'max. 5000 Zeichen' },
    })
    expect(result.data?.maxLength).toBe(5000)
  })

  it('gibt undefined zurück wenn String keine Ziffern enthält', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.9,
      data: { ...BASE_DATA, maxLength: 'keine Angabe' },
    })
    expect(result.data?.maxLength).toBeUndefined()
  })
})

describe('ExtractionResponseSchema — optionale Felder', () => {
  it('ist gültig ohne optionale Felder', () => {
    const result = ExtractionResponseSchema.parse({
      relevant: true,
      confidence: 0.95,
      data: BASE_DATA,
    })
    expect(result.data?.theme).toBeUndefined()
    expect(result.data?.prize).toBeUndefined()
    expect(result.data?.fee).toBeUndefined()
  })
})
