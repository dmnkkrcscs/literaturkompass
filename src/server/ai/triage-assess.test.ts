import { describe, it, expect } from 'vitest'
import { parseTriageResponse } from './triage-assess'

describe('parseTriageResponse', () => {
  it('parses a valid JSON response', () => {
    const result = parseTriageResponse('{"score": 72, "reason": "Passt gut zum Profil."}')
    expect(result).toEqual({ score: 72, reason: 'Passt gut zum Profil.' })
  })

  it('extracts JSON embedded in surrounding text (Markdown-wrapped)', () => {
    const raw = 'Hier ist meine Bewertung:\n```json\n{"score": 85, "reason": "Sehr gute Passung."}\n```'
    const result = parseTriageResponse(raw)
    expect(result).toEqual({ score: 85, reason: 'Sehr gute Passung.' })
  })

  it('clamps score above 100 to 100', () => {
    const result = parseTriageResponse('{"score": 150, "reason": "Übertrieben."}')
    expect(result.score).toBe(100)
  })

  it('clamps score below 1 to 1', () => {
    const result = parseTriageResponse('{"score": -5, "reason": "Gar nicht passend."}')
    expect(result.score).toBe(1)
  })

  it('rounds fractional scores', () => {
    const result = parseTriageResponse('{"score": 72.6, "reason": "Fast 73."}')
    expect(result.score).toBe(73)
  })

  it('returns null for empty string', () => {
    expect(parseTriageResponse('')).toEqual({ score: null, reason: null })
  })

  it('returns null for text without JSON', () => {
    expect(parseTriageResponse('Tut mir leid, ich kann nicht antworten.')).toEqual({ score: null, reason: null })
  })

  it('returns null for invalid JSON', () => {
    expect(parseTriageResponse('{score: 50, reason: "missing quotes"}')).toEqual({ score: null, reason: null })
  })

  it('returns null when score field is missing', () => {
    expect(parseTriageResponse('{"reason": "Kein Score."}')).toEqual({ score: null, reason: null })
  })

  it('returns null when reason field is missing', () => {
    expect(parseTriageResponse('{"score": 50}')).toEqual({ score: null, reason: null })
  })

  it('handles score exactly at boundary (1 and 100) without clamping', () => {
    expect(parseTriageResponse('{"score": 1, "reason": "Minimum."}').score).toBe(1)
    expect(parseTriageResponse('{"score": 100, "reason": "Maximum."}').score).toBe(100)
  })
})
