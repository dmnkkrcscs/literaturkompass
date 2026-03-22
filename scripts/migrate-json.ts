import * as fs from 'fs'
import * as path from 'path'
import { db } from '../src/lib/db'
import { CompType } from '@prisma/client'

interface V1Competition {
  id: string
  type: 'wettbewerb' | 'anthologie' | 'zeitschrift'
  name: string
  organizer?: string
  deadline?: string
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
  source: string
}

interface V1Data {
  lastUpdated: string
  lastChecked?: string
  competitions: V1Competition[]
}

interface V1SubmissionItem {
  id: string
  name: string
  title: string
  theme: string
  publication: string
  date: string
}

interface ExcludedData {
  urls: string[]
  ids: string[]
}

async function loadJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return null
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error)
    return null
  }
}

function mapCompetitionType(type: string): CompType {
  const typeMap: Record<string, CompType> = {
    wettbewerb: 'WETTBEWERB',
    anthologie: 'ANTHOLOGIE',
    zeitschrift: 'ZEITSCHRIFT',
  }
  return typeMap[type] || 'WETTBEWERB'
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

async function findOrCreateSource(sourceName: string) {
  // First try to find by name
  let source = await db.source.findUnique({
    where: { url: sourceName },
  })

  if (!source) {
    // Create new source
    source = await db.source.create({
      data: {
        name: sourceName,
        url: sourceName,
        type: 'AGGREGATOR',
        isActive: true,
      },
    })
  }

  return source
}

async function migrateCompetitions(
  competitions: V1Competition[],
  excludedIds: Set<string>,
  excludedUrls: Set<string>,
) {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const comp of competitions) {
    try {
      // Skip if excluded
      if (excludedIds.has(comp.id) || excludedUrls.has(comp.url)) {
        console.log(`  ⊘ Skipped (excluded): ${comp.name}`)
        skipped++
        continue
      }

      // Find or create source
      const source = await findOrCreateSource(comp.source)

      // Parse deadline
      let deadline: Date | null = null
      if (comp.deadline) {
        deadline = new Date(comp.deadline)
        if (isNaN(deadline.getTime())) {
          deadline = null
        }
      }

      // Check if competition exists by URL
      const existing = await db.competition.findUnique({
        where: { url: comp.url },
      })

      if (existing) {
        // Update existing
        await db.competition.update({
          where: { id: existing.id },
          data: {
            legacyId: comp.id,
            type: mapCompetitionType(comp.type),
            name: comp.name,
            organizer: comp.organizer || null,
            deadline,
            theme: comp.theme || null,
            genres: comp.genres || [],
            prize: comp.prize || null,
            maxLength: comp.maxLength || null,
            requirements: comp.requirements || null,
            ageRestriction: comp.ageRestriction || null,
            regionRestriction: comp.regionRestriction || null,
            fee: comp.fee || null,
            description: comp.description || null,
          },
        })
        console.log(`  ✓ Updated: ${comp.name}`)
        updated++
      } else {
        // Create new
        await db.competition.create({
          data: {
            legacyId: comp.id,
            type: mapCompetitionType(comp.type),
            name: comp.name,
            organizer: comp.organizer || null,
            deadline,
            theme: comp.theme || null,
            genres: comp.genres || [],
            prize: comp.prize || null,
            maxLength: comp.maxLength || null,
            requirements: comp.requirements || null,
            ageRestriction: comp.ageRestriction || null,
            regionRestriction: comp.regionRestriction || null,
            fee: comp.fee || null,
            url: comp.url,
            description: comp.description || null,
            sourceId: source.id,
          },
        })
        console.log(`  ✓ Created: ${comp.name}`)
        created++
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${comp.name}:`, error)
      skipped++
    }
  }

  return { created, updated, skipped }
}

async function migrateSubmissions(
  submissions: V1SubmissionItem[],
  status: 'SUBMITTED' | 'ACCEPTED',
) {
  let created = 0
  let skipped = 0

  for (const sub of submissions) {
    try {
      // Find competition by legacyId or name
      let competition = await db.competition.findUnique({
        where: { legacyId: sub.id },
      })

      if (!competition) {
        // Try to find by name
        competition = await db.competition.findFirst({
          where: { name: sub.name },
        })
      }

      if (!competition) {
        console.log(
          `  ⊘ No competition found for submission: ${sub.id} (${sub.name})`,
        )
        skipped++
        continue
      }

      // Check if submission already exists
      const existing = await db.submission.findFirst({
        where: {
          competitionId: competition.id,
        },
      })

      if (!existing) {
        // Parse submission date
        let submittedAt: Date | null = null
        if (sub.date) {
          submittedAt = new Date(sub.date)
          if (isNaN(submittedAt.getTime())) {
            submittedAt = null
          }
        }

        await db.submission.create({
          data: {
            competitionId: competition.id,
            status,
            submittedAt,
            notes: `${sub.title} | Theme: ${sub.theme} | Publication: ${sub.publication}`,
          },
        })
        console.log(`  ✓ Created submission: ${sub.name}`)
        created++
      } else {
        console.log(`  ⊘ Submission already exists: ${sub.name}`)
        skipped++
      }
    } catch (error) {
      console.error(`  ✗ Error processing submission ${sub.id}:`, error)
      skipped++
    }
  }

  return { created, skipped }
}

async function main() {
  // Get data path from CLI argument or use default
  let dataPath = process.argv[2]
  if (!dataPath) {
    // Default to data/ directory in app root
    const scriptDir = path.dirname(new URL(import.meta.url).pathname)
    dataPath = path.join(scriptDir, '..', 'data', 'data.json')
  }

  // Resolve to absolute path
  dataPath = path.resolve(dataPath)
  const dataDir = path.dirname(dataPath)

  console.log(`\n📚 Literaturkompass v1 → v2 Migration\n`)
  console.log(`Loading from: ${dataPath}\n`)

  // Load all data files
  const data = await loadJsonFile<V1Data>(dataPath)
  if (!data) {
    console.error('Failed to load data.json')
    process.exit(1)
  }

  const submittedData = await loadJsonFile<V1SubmissionItem[]>(
    path.join(dataDir, 'server_submitted.json'),
  )
  const acceptedData = await loadJsonFile<V1SubmissionItem[]>(
    path.join(dataDir, 'server_accepted.json'),
  )
  const excludedData = await loadJsonFile<ExcludedData>(
    path.join(dataDir, 'excluded.json'),
  )

  // Build excluded sets
  const excludedIds = new Set(excludedData?.ids || [])
  const excludedUrls = new Set(excludedData?.urls || [])

  console.log(`Loaded ${data.competitions.length} competitions`)
  if (submittedData) console.log(`Loaded ${submittedData.length} submitted items`)
  if (acceptedData) console.log(`Loaded ${acceptedData.length} accepted items`)
  console.log(`Excluded: ${excludedIds.size} IDs, ${excludedUrls.size} URLs\n`)

  try {
    // Migrate competitions
    console.log(`\n📝 Migrating Competitions...`)
    const compResult = await migrateCompetitions(
      data.competitions,
      excludedIds,
      excludedUrls,
    )

    // Migrate submitted items
    console.log(`\n📤 Migrating Submitted Items...`)
    const subResult = submittedData
      ? await migrateSubmissions(submittedData, 'SUBMITTED')
      : { created: 0, skipped: 0 }

    // Migrate accepted items
    console.log(`\n✅ Migrating Accepted Items...`)
    const accResult = acceptedData
      ? await migrateSubmissions(acceptedData, 'ACCEPTED')
      : { created: 0, skipped: 0 }

    // Get source count
    const sourceCount = await db.source.count()

    // Print summary
    console.log(`\n${'='.repeat(60)}`)
    console.log(`✨ Migration Summary\n`)
    console.log(
      `Competitions:      ${compResult.created} created, ${compResult.updated} updated, ${compResult.skipped} skipped`,
    )
    console.log(`Submissions:       ${subResult.created} created, ${subResult.skipped} skipped`)
    console.log(`Accepted:          ${accResult.created} created, ${accResult.skipped} skipped`)
    console.log(`Sources created:   ${sourceCount}`)
    console.log(`${'='.repeat(60)}\n`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
