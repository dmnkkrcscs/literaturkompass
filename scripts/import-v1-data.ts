/**
 * Import Literaturkompass v1 data from local JSON files
 *
 * Usage: npx tsx scripts/import-v1-data.ts
 *
 * Reads from data/ directory:
 *   - extracted_data.json (competitions + magazines from index.html)
 *   - server_prefs.json (user preferences: starred, dismissed, overrides)
 *   - server_submitted.json (submitted entries with titles)
 *   - server_accepted.json (accepted entries with titles)
 *   - server_blacklist.json (dismissed sources)
 *   - server_manual.json (manually added competitions)
 *   - server_manual_mags.json (manually added magazines)
 *   - server_manual_deadlines.json (manually added magazine deadlines)
 *   - starred.json (starred items)
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const db = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), 'data')

function readJson(filename: string): any {
  const filepath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filepath)) {
    console.warn(`[Import] ${filename} not found, skipping`)
    return null
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

function parseDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline) return null
  const date = new Date(deadline)
  return isNaN(date.getTime()) ? null : date
}

function mapType(type: string): 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT' {
  switch (type?.toLowerCase()) {
    case 'wettbewerb': return 'WETTBEWERB'
    case 'anthologie': return 'ANTHOLOGIE'
    case 'zeitschrift': return 'ZEITSCHRIFT'
    default: return 'WETTBEWERB'
  }
}

async function main() {
  console.log('[Import] Starting v1 data import from local JSON files\n')

  // Read all data files
  const extractedData = readJson('extracted_data.json')
  const prefs: Record<string, any> = readJson('server_prefs.json') || {}
  const submitted: any[] = readJson('server_submitted.json') || []
  const accepted: any[] = readJson('server_accepted.json') || []
  const blacklist: Record<string, number> = readJson('server_blacklist.json') || {}
  const manualComps: any[] = readJson('server_manual.json') || []
  const manualMags: any[] = readJson('server_manual_mags.json') || []
  const manualDeadlines: any[] = readJson('server_manual_deadlines.json') || []
  const starredData = readJson('starred.json')
  const starredItems: string[] = starredData?.items?.map((i: any) => i.id) || []

  // Competitions from embedded page data
  const competitions: any[] = extractedData?.competitions || []
  const magazines: any[] = extractedData?.magazines || []

  console.log(`[Import] Competitions from page: ${competitions.length}`)
  console.log(`[Import] Magazines from page: ${magazines.length}`)
  console.log(`[Import] Manual competitions: ${manualComps.length}`)
  console.log(`[Import] Manual magazines: ${manualMags.length}`)
  console.log(`[Import] Manual deadlines: ${manualDeadlines.length}`)
  console.log(`[Import] Preferences: ${Object.keys(prefs).length}`)
  console.log(`[Import] Submitted: ${submitted.length}`)
  console.log(`[Import] Accepted: ${accepted.length}`)
  console.log(`[Import] Blacklisted sources: ${Object.keys(blacklist).length}`)
  console.log(`[Import] Starred: ${starredItems.length}`)
  console.log()

  // Create import source
  const source = await db.source.upsert({
    where: { url: 'v1-import' },
    update: {},
    create: {
      name: 'V1 Import',
      url: 'v1-import',
      type: 'MANUAL',
      isActive: false,
    },
  })

  // Build lookup maps
  const submittedMap = new Map<string, any>()
  for (const s of submitted) {
    submittedMap.set(s.id, s)
  }
  const acceptedMap = new Map<string, any>()
  for (const a of accepted) {
    acceptedMap.set(a.id, a)
  }

  // Merge manual competitions into the list
  for (const mc of manualComps) {
    if (!competitions.find((c: any) => c.id === mc.id)) {
      competitions.push(mc)
    }
  }

  // Merge manual deadlines into a lookup
  const manualDeadlineMap = new Map<string, any>()
  for (const md of manualDeadlines) {
    manualDeadlineMap.set(md.id, md)
  }

  // Merge manual magazines
  for (const mm of manualMags) {
    if (!magazines.find((m: any) => m.id === mm.id)) {
      magazines.push(mm)
    }
  }

  let created = 0
  let skipped = 0
  let submissionsCreated = 0

  // ── Import competitions ──────────────────────────────────
  for (const comp of competitions) {
    const pref = prefs[comp.id] || {}
    const isStarred = pref.starred === true || starredItems.includes(comp.id)
    const isDismissed = pref.dismissed === true
    const overrides = pref.overrides || {}

    const name = overrides.name || comp.name
    const url = overrides.url || pref.sourceUrl || comp.url
    const deadline = parseDeadline(overrides.deadline || comp.deadline)
    const theme = overrides.theme || comp.theme || null
    const requirements = overrides.requirements || pref.customRequirements || comp.requirements || null
    const description = overrides.description || comp.description || null
    const prize = overrides.prize || comp.prize || null
    const maxLength = overrides.maxLength || comp.maxLength || null

    if (!url) {
      console.warn(`[Import] Skipping ${name}: no URL`)
      skipped++
      continue
    }

    try {
      // Check if already exists
      const existing = await db.competition.findFirst({
        where: { OR: [{ url }, { legacyId: comp.id }] },
      })
      if (existing) {
        console.log(`[Import] Already exists: ${name}`)
        skipped++
        // Still check for submissions
        await createSubmissionIfNeeded(existing.id, comp.id, submittedMap, acceptedMap)
        continue
      }

      const competition = await db.competition.create({
        data: {
          legacyId: comp.id,
          name,
          type: mapType(comp.type),
          organizer: comp.organizer || null,
          deadline,
          theme,
          genres: comp.genres || [],
          prize,
          maxLength,
          requirements,
          ageRestriction: comp.ageRestriction || null,
          regionRestriction: comp.regionRestriction || null,
          fee: comp.fee || null,
          url,
          description,
          source: { connect: { id: source.id } },
          starred: isStarred,
          dismissed: isDismissed,
          ...(isStarred && { starredAt: new Date() }),
        },
      })

      console.log(`[Import] ✓ ${name}${isStarred ? ' ★' : ''}${isDismissed ? ' ✗' : ''}`)
      created++

      const subCreated = await createSubmissionIfNeeded(competition.id, comp.id, submittedMap, acceptedMap)
      submissionsCreated += subCreated
    } catch (error: any) {
      console.error(`[Import] ✗ ${name}: ${error.message}`)
      skipped++
    }
  }

  // ── Import magazines (with their deadlines as individual competitions) ──
  for (const mag of magazines) {
    const pref = prefs[mag.id] || {}
    const isStarred = pref.starred === true || starredItems.includes(mag.id)
    const isDismissed = pref.dismissed === true
    const url = mag.submissionUrl || mag.url

    if (!url) {
      console.warn(`[Import] Skipping magazine ${mag.name}: no URL`)
      skipped++
      continue
    }

    // If magazine has submission deadlines, create one competition per deadline
    const deadlines = mag.submissionDeadlines || []

    if (deadlines.length > 0) {
      for (const dl of deadlines) {
        const dlId = `${mag.id}-${dl.date}`
        const dlPref = prefs[dlId] || {}
        const dlStarred = dlPref.starred === true || isStarred || starredItems.includes(dlId)
        const dlDismissed = dlPref.dismissed === true
        const dlOverrides = dlPref.overrides || {}

        const name = dlOverrides.name || `${mag.name} – ${dl.theme}`
        const dlUrl = dlOverrides.url || url
        const deadline = parseDeadline(dlOverrides.deadline || dl.date)
        const theme = dlOverrides.theme || dl.theme
        const requirements = dlOverrides.requirements || pref.customRequirements || mag.requirements || null
        const description = dlOverrides.description || mag.description || null

        try {
          const existing = await db.competition.findFirst({
            where: { OR: [{ legacyId: dlId }, { legacyId: `${mag.id}` }] },
          })

          // Use unique URL per deadline to avoid conflicts
          const uniqueUrl = `${dlUrl}#${dl.date}`

          if (existing) {
            console.log(`[Import] Already exists: ${name}`)
            skipped++
            await createSubmissionIfNeeded(existing.id, dlId, submittedMap, acceptedMap)
            continue
          }

          const competition = await db.competition.create({
            data: {
              legacyId: dlId,
              name,
              type: 'ZEITSCHRIFT',
              organizer: mag.location || null,
              deadline,
              theme,
              genres: mag.genres || [],
              requirements,
              url: uniqueUrl,
              description,
              source: { connect: { id: source.id } },
              starred: dlStarred,
              dismissed: dlDismissed,
              ...(dlStarred && { starredAt: new Date() }),
            },
          })

          console.log(`[Import] ✓ ${name}${dlStarred ? ' ★' : ''}${dlDismissed ? ' ✗' : ''}`)
          created++

          const subCreated = await createSubmissionIfNeeded(competition.id, dlId, submittedMap, acceptedMap)
          submissionsCreated += subCreated
        } catch (error: any) {
          console.error(`[Import] ✗ ${name}: ${error.message}`)
          skipped++
        }
      }
    } else {
      // Magazine without specific deadlines - import as single entry
      try {
        const existing = await db.competition.findFirst({
          where: { OR: [{ url }, { legacyId: mag.id }] },
        })
        if (existing) {
          console.log(`[Import] Already exists: ${mag.name}`)
          skipped++
          continue
        }

        await db.competition.create({
          data: {
            legacyId: mag.id,
            name: mag.name,
            type: 'ZEITSCHRIFT',
            organizer: mag.location || null,
            deadline: parseDeadline(mag.deadline),
            genres: mag.genres || [],
            requirements: mag.requirements || null,
            url,
            description: mag.description || null,
            source: { connect: { id: source.id } },
            starred: isStarred,
            dismissed: isDismissed,
            ...(isStarred && { starredAt: new Date() }),
          },
        })

        console.log(`[Import] ✓ ${mag.name}${isStarred ? ' ★' : ''}`)
        created++
      } catch (error: any) {
        console.error(`[Import] ✗ ${mag.name}: ${error.message}`)
        skipped++
      }
    }
  }

  // ── Import manual deadlines that weren't part of known magazines ──
  for (const md of manualDeadlines) {
    const existing = await db.competition.findFirst({
      where: { legacyId: md.id },
    })
    if (existing) continue

    const pref = prefs[md.id] || {}
    const isStarred = pref.starred === true || starredItems.includes(md.id)
    const url = md.url || 'https://manual-entry.local'

    try {
      const competition = await db.competition.create({
        data: {
          legacyId: md.id,
          name: md.name,
          type: 'ZEITSCHRIFT',
          deadline: parseDeadline(md.deadline),
          theme: md.theme || null,
          url: `${url}#${md.id}`,
          source: { connect: { id: source.id } },
          starred: isStarred,
          ...(isStarred && { starredAt: new Date() }),
        },
      })

      console.log(`[Import] ✓ (deadline) ${md.name}${isStarred ? ' ★' : ''}`)
      created++

      const subCreated = await createSubmissionIfNeeded(competition.id, md.id, submittedMap, acceptedMap)
      submissionsCreated += subCreated
    } catch (error: any) {
      // Skip duplicates silently
      if (error.code !== 'P2002') {
        console.error(`[Import] ✗ ${md.name}: ${error.message}`)
      }
      skipped++
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`  Importiert: ${created}`)
  console.log(`  Übersprungen: ${skipped}`)
  console.log(`  Einreichungen: ${submissionsCreated}`)
  console.log('═══════════════════════════════════════\n')

  await db.$disconnect()
}

async function createSubmissionIfNeeded(
  competitionId: string,
  legacyId: string,
  submittedMap: Map<string, any>,
  acceptedMap: Map<string, any>,
): Promise<number> {
  const subData = submittedMap.get(legacyId)
  const accData = acceptedMap.get(legacyId)

  if (!subData && !accData) return 0

  // Check if submission already exists
  const existing = await db.submission.findFirst({
    where: { competitionId },
  })
  if (existing) return 0

  const isAccepted = !!accData
  const data = accData || subData

  await db.submission.create({
    data: {
      competitionId,
      status: isAccepted ? 'ACCEPTED' : 'SUBMITTED',
      title: data.title || null,
      submittedAt: data.date ? new Date(data.date) : new Date(),
      ...(isAccepted && { responseAt: new Date() }),
    },
  })

  const label = isAccepted ? 'ANGENOMMEN' : 'EINGEREICHT'
  console.log(`  → ${label}: "${data.title || '?'}"`)
  return 1
}

main().catch((error) => {
  console.error('[Import] Fatal error:', error)
  process.exit(1)
})
