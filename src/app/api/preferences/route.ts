import { NextRequest, NextResponse } from 'next/server'

const PREFS_KEY = 'user:preferences'

// Lazy Redis import to avoid crash when Redis is not available
async function getRedis() {
  try {
    const { redis } = await import('@/lib/redis')
    return redis
  } catch {
    return null
  }
}

export interface UserPreferences {
  bio: string           // Schreibstil, Interessen, bisherige Veröffentlichungen
  favoriteGenres: string[]
  favoriteThemes: string[]
  dislikedTopics: string[]
  ageRestriction: boolean   // Gibt es Alterseinschränkungen?
  location: string          // Wohnort (für regionale Wettbewerbe)
  updatedAt: string
}

const DEFAULTS: UserPreferences = {
  bio: '',
  favoriteGenres: [],
  favoriteThemes: [],
  dislikedTopics: [],
  ageRestriction: false,
  location: '',
  updatedAt: new Date().toISOString(),
}

/** GET /api/preferences */
export async function GET() {
  const redis = await getRedis()
  if (!redis) {
    return NextResponse.json({ preferences: DEFAULTS, redisAvailable: false })
  }
  try {
    const raw = await redis.get(PREFS_KEY)
    const preferences: UserPreferences = raw ? JSON.parse(raw) : DEFAULTS
    return NextResponse.json({ preferences, redisAvailable: true })
  } catch {
    return NextResponse.json({ preferences: DEFAULTS, redisAvailable: false })
  }
}

/** POST /api/preferences */
export async function POST(req: NextRequest) {
  const redis = await getRedis()
  if (!redis) {
    return NextResponse.json({ success: false, error: 'Redis nicht verfügbar' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const preferences: UserPreferences = {
      bio: body.bio ?? '',
      favoriteGenres: body.favoriteGenres ?? [],
      favoriteThemes: body.favoriteThemes ?? [],
      dislikedTopics: body.dislikedTopics ?? [],
      ageRestriction: body.ageRestriction ?? false,
      location: body.location ?? '',
      updatedAt: new Date().toISOString(),
    }
    await redis.set(PREFS_KEY, JSON.stringify(preferences))
    return NextResponse.json({ success: true, preferences })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
