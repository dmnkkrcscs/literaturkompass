import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { daysUntil, daysSince, createMemoryCache, TYPE_LABELS } from './utils'

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns positive days for a future date', () => {
    const future = new Date('2026-05-20T00:00:00Z')
    expect(daysUntil(future)).toBeGreaterThan(0)
  })

  it('returns 0 for today (same day, earlier UTC)', () => {
    const today = new Date('2026-05-15T00:00:00Z')
    // ceil(-0.5) = -0 in JS; + 0 normalises -0 → 0 for the assertion
    expect(daysUntil(today) + 0).toBe(0)
  })

  it('returns negative days for a past date', () => {
    const past = new Date('2026-05-10T00:00:00Z')
    expect(daysUntil(past)).toBeLessThan(0)
  })

  it('returns exactly 5 for a date 5 days away (at midnight)', () => {
    const fiveDays = new Date('2026-05-20T12:00:00Z') // same time → exactly 5 days
    expect(daysUntil(fiveDays)).toBe(5)
  })
})

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns 0 for today', () => {
    const today = new Date('2026-05-15T12:00:00Z')
    expect(daysSince(today)).toBe(0)
  })

  it('returns positive days for a past date', () => {
    const threeDaysAgo = new Date('2026-05-12T12:00:00Z')
    expect(daysSince(threeDaysAgo)).toBe(3)
  })

  it('returns negative for a future date', () => {
    const tomorrow = new Date('2026-05-16T12:00:00Z')
    expect(daysSince(tomorrow)).toBeLessThan(0)
  })
})

describe('createMemoryCache', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns null before any value is set', () => {
    const cache = createMemoryCache<string>(1000)
    expect(cache.get()).toBeNull()
  })

  it('returns the set value within TTL', () => {
    const cache = createMemoryCache<string>(5000)
    cache.set('hello')
    expect(cache.get()).toBe('hello')
  })

  it('returns null after TTL has expired', () => {
    const cache = createMemoryCache<string>(1000)
    cache.set('hello')
    vi.advanceTimersByTime(1001)
    expect(cache.get()).toBeNull()
  })

  it('still returns value just before TTL expiry', () => {
    const cache = createMemoryCache<string>(1000)
    cache.set('hello')
    vi.advanceTimersByTime(999)
    expect(cache.get()).toBe('hello')
  })

  it('overwrites old value on second set', () => {
    const cache = createMemoryCache<number>(5000)
    cache.set(1)
    cache.set(2)
    expect(cache.get()).toBe(2)
  })

  it('resets TTL on second set', () => {
    const cache = createMemoryCache<string>(1000)
    cache.set('first')
    vi.advanceTimersByTime(800)
    cache.set('second') // resets TTL
    vi.advanceTimersByTime(800) // 1600ms total from first set, 800ms from second
    expect(cache.get()).toBe('second') // should still be valid (800ms < 1000ms)
  })

  it('works with object values', () => {
    const cache = createMemoryCache<{ items: number[] }>(5000)
    const data = { items: [1, 2, 3] }
    cache.set(data)
    expect(cache.get()).toEqual(data)
  })
})

describe('TYPE_LABELS', () => {
  it('has German labels for all known types', () => {
    expect(TYPE_LABELS['WETTBEWERB']).toBe('Wettbewerb')
    expect(TYPE_LABELS['ANTHOLOGIE']).toBe('Anthologie')
    expect(TYPE_LABELS['ZEITSCHRIFT']).toBe('Zeitschrift')
  })
})
