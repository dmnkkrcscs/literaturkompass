/**
 * Scrape Literaturkompass v1 (neonwilderness.net) and import into v2 database
 *
 * Usage: npx tsx scripts/scrape-v1-site.ts
 *
 * This script:
 * 1. Fetches the v1 page to extract embedded competition/magazine data
 * 2. Fetches user preferences (starred, dismissed, submitted, accepted) from prefs.php
 * 3. Imports everything into the Prisma database
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const V1_URL = 'https://literaturkompass.neonwilderness.net'
const V1_PASSWORD = '14Lei805'

interface V1Competition {
  id: string
  type: 'wettbewerb' | 'anthologie' | 'zeitschrift'
  name: string
  organizer?: string
  deadline?: string | null
  theme?: string
  genres?: string[]
  prize?: string
  maxLength?: string
  requirements?: string
  ageRestriction?: string | null
  regionRestriction?: string | null
  fee?: string | null
  url: string
  description?: string
  source?: string
}

interface V1Magazine {
  id: string
  type: 'zeitschrift'
  name: string
  location?: string
  genres?: string[]
  submissionStatus?: string
  deadline?: string | null
  submissionEmail?: string | null
  requirements?: string
  url: string
  description?: string
  submissionDeadlines?: Array<{ date: string; theme: string }>
  submissionUrl?: string
}

interface V1Prefs {
  [id: string]: {
    starred?: boolean
    dismissed?: boolean
    overrides?: Record<string, any>
    customRequirements?: string
    sourceUrl?: string
  }
}

interface V1Data {
  lastUpdated: string
  competitions: V1Competition[]
  magazines: V1Magazine[]
  resourceLinks?: any[]
  papierfresserchen?: any[]
}

async function fetchPageData(): Promise<V1Data> {
  console.log('[Import] Fetching v1 page data...')
  const response = await fetch(V1_URL)
  const html = await response.text()

  // Extract JSON from <script id="appdata" type="application/json">
  const match = html.match(/<script[^>]*id="appdata"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) {
    // Try alternate pattern
    const jsonMatch = html.match(/EMBEDDED_DATA\s*=\s*({[\s\S]*?});/)
    if (!jsonMatch) {
      throw new Error('Could not find embedded data in page')
    }
    return JSON.parse(jsonMatch[1])
  }

  return JSON.parse(match[1])
}

async function fetchPrefs(): Promise<{
  prefs: V1Prefs
  submitted: any[]
  accepted: any[]
}> {
  console.log('[Import] Fetching v1 preferences...')
  try {
    const response = await fetch(`${V1_URL}/prefs.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: V1_PASSWORD, action: 'load' }),
    })

    if (!response.ok) {
      console.warn(`[Import] prefs.php returned ${response.status}, using defaults`)
      return { prefs: {}, submitted: [], accepted: [] }
    }

    const data = await response.json()
    return {
      prefs: data.prefs || {},
      submitted: data.submitted || [],
      accepted: data.accepted || [],
    }
  } catch (error) {
    console.warn('[Import] Failed to fetch prefs, using defaults:', error)
    return { prefs: {}, submitted: [], accepted: [] }
  }
}

function mapType(type: string): 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT' {
  switch (type.toLowerCase()) {
    case 'wettbewerb': return 'WETTBEWERB'
    case 'anthologie': return 'ANTHOLOGIE'
    case 'zeitschrift': return 'ZEITSCHRIFT'
    default: return 'WETTBEWERB'
  }
}

function parseDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline) return null
  const date = new Date(deadline)
  return isNaN(date.getTime()) ? null : date
}

async function main() {
  console.log('[Import] Starting v1 data import from neonwilderness.net')

  // Fetch data
  const [pageData, userPrefs] = await Promise.all([
    fetchPageData(),
    fetchPrefs(),
  ])

  console.log(`[Import] Found ${pageData.competitions.length} competitions`)
  console.log(`[Import] Found ${pageData.magazines.length} magazines`)
  console.log(`[Import] Found ${Object.keys(userPrefs.prefs).length} preferences`)
  console.log(`[Import] Found ${userPrefs.submitted.length} submitted entries`)
  console.log(`[Import] Found ${userPrefs.accepted.length} accepted entries`)

  // Create/find source
  const source = await db.source.upsert({
    where: { url: 'v1-import' },
    update: {},
    create: {
      name: 'V1 Import (neonwilderness.net)',
      url: 'v1-import',
      type: 'MANUAL',
      isActive: false,
    },
  })

  // Build sets for quick lookup
  const submittedIds = new Set(userPrefs.submitted.map((s: any) => s.id || s))
  const acceptedIds = new Set(userPrefs.accepted.map((s: any) => s.id || s))

  let created = 0
  let updated = 0
  let skipped = 0
  let submissionsCreated = 0

  // Import competitions
  for (const comp of pageData.competitions) {
    const pref = userPrefs.prefs[comp.id]
    const isStarred = pref?.starred || false
    const isDismissed = pref?.dismissed || false

    try {
      const competition = await db.competition.upsert({
        where: { url: comp.url },
        update: {
          // Update with overrides if user had custom edits
          ...(pref?.overrides?.name && { name: pref.overrides.name }),
          ...(pref?.overrides?.deadline && { deadline: parseDeadline(pref.overrides.deadline) }),
          ...(pref?.overrides?.theme && { theme: pref.overrides.theme }),
          starred: isStarred,
          dismissed: isDismissed,
        },
        create: {
          legacyId: comp.id,
          name: pref?.overrides?.name || comp.name,
          type: mapType(comp.type),
          organizer: comp.organizer || null,
          deadline: parseDeadline(pref?.overrides?.deadline || comp.deadline),
          theme: pref?.overrides?.theme || comp.theme || null,
          genres: comp.genres || [],
          prize: pref?.overrides?.prize || comp.prize || null,
          maxLength: comp.maxLength || null,
          requirements: pref?.customRequirements || comp.requirements || null,
          ageRestriction: comp.ageRestriction || null,
          regionRestriction: comp.regionRestriction || null,
          fee: comp.fee || null,
          url: pref?.sourceUrl || comp.url,
          description: comp.description || null,
          source: { connect: { id: source.id } },
          starred: isStarred,
          dismissed: isDismissed,
          ...(isStarred && { starredAt: new Date() }),
        },
      })

      // Create submission if submitted or accepted
      if (submittedIds.has(comp.id) || acceptedIds.has(comp.id)) {
        const status = acceptedIds.has(comp.id) ? 'ACCEPTED' : 'SUBMITTED'

        // Check if submission already exists
        const existing = await db.submission.findFirst({
          where: { competitionId: competition.id },
        })

        if (!existing) {
          // Try to find title from submitted/accepted data
          const subData = userPrefs.submitted.find((s: any) => (s.id || s) === comp.id)
          const accData = userPrefs.accepted.find((s: any) => (s.id || s) === comp.id)
          const entryData = accData || subData

          await db.submission.create({
            data: {
              competitionId: competition.id,
              status,
              title: typeof entryData === 'object' ? entryData.title || null : null,
              submittedAt: typeof entryData === 'object' && entryData.submittedAt
                ? new Date(entryData.submittedAt)
                : new Date(),
              ...(status === 'ACCEPTED' && { responseAt: new Date() }),
            },
          })
          submissionsCreated++
        }
      }

      created++
    } catch (error: any) {
      if (error.code === 'P2002') {
        updated++
      } else {
        console.error(`[Import] Error importing ${comp.name}:`, error.message)
        skipped++
      }
    }
  }

  // Import magazines as ZEITSCHRIFT competitions
  for (const mag of pageData.magazines) {
    const pref = userPrefs.prefs[mag.id]
    const isStarred = pref?.starred || false
    const isDismissed = pref?.dismissed || false

    // Use first submission deadline if available
    let deadline: Date | null = null
    if (mag.submissionDeadlines && mag.submissionDeadlines.length > 0) {
      const futureDeadlines = mag.submissionDeadlines
        .map(d => ({ ...d, parsed: new Date(d.date) }))
        .filter(d => d.parsed > new Date())
        .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())

      if (futureDeadlines.length > 0) {
        deadline = futureDeadlines[0].parsed
      }
    }

    try {
      const competition = await db.competition.upsert({
        where: { url: mag.submissionUrl || mag.url },
        update: {
          starred: isStarred,
          dismissed: isDismissed,
          ...(deadline && { deadline }),
        },
        create: {
          legacyId: mag.id,
          name: mag.name,
          type: 'ZEITSCHRIFT',
          organizer: mag.location || null,
          deadline,
          theme: mag.submissionDeadlines?.[0]?.theme || null,
          genres: mag.genres || [],
          requirements: mag.requirements || null,
          url: mag.submissionUrl || mag.url,
          description: mag.description || null,
          source: { connect: { id: source.id } },
          starred: isStarred,
          dismissed: isDismissed,
          ...(isStarred && { starredAt: new Date() }),
        },
      })

      // Create submission if submitted or accepted
      if (submittedIds.has(mag.id) || acceptedIds.has(mag.id)) {
        const status = acceptedIds.has(mag.id) ? 'ACCEPTED' : 'SUBMITTED'
        const existing = await db.submission.findFirst({
          where: { competitionId: competition.id },
        })

        if (!existing) {
          const subData = userPrefs.submitted.find((s: any) => (s.id || s) === mag.id)
          const accData = userPrefs.accepted.find((s: any) => (s.id || s) === mag.id)
          const entryData = accData || subData

          await db.submission.create({
            data: {
              competitionId: competition.id,
              status,
              title: typeof entryData === 'object' ? entryData.title || null : null,
              submittedAt: typeof entryData === 'object' && entryData.submittedAt
                ? new Date(entryData.submittedAt)
                : new Date(),
              ...(status === 'ACCEPTED' && { responseAt: new Date() }),
            },
          })
          submissionsCreated++
        }
      }

      created++
    } catch (error: any) {
      if (error.code === 'P2002') {
        updated++
      } else {
        console.error(`[Import] Error importing magazine ${mag.name}:`, error.message)
        skipped++
      }
    }
  }

  console.log('\n[Import] ============ SUMMARY ============')
  console.log(`[Import] Competitions imported: ${created}`)
  console.log(`[Import] Updated: ${updated}`)
  console.log(`[Import] Skipped (errors): ${skipped}`)
  console.log(`[Import] Submissions created: ${submissionsCreated}`)
  console.log('[Import] ====================================\n')

  await db.$disconnect()
}

main().catch((error) => {
  console.error('[Import] Fatal error:', error)
  process.exit(1)
})
