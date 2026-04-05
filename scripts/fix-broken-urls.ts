/**
 * Find and flag broken internal URLs in the database
 *
 * Usage: npx tsx scripts/fix-broken-urls.ts [--dry-run]
 *
 * Finds all competitions with `literaturkompass.internal` or other broken URLs
 * and marks them so they can be fixed via the UI edit function.
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

const BROKEN_URL_PATTERNS = [
  'literaturkompass.internal',
  'literaturkompass.neonwilderness.net/dach',
  'localhost:',
  '127.0.0.1',
]

async function main() {
  console.log(`[URL-Fix] Scanning for broken URLs... ${DRY_RUN ? '(DRY RUN)' : ''}`)

  const allCompetitions = await db.competition.findMany({
    select: { id: true, name: true, url: true },
  })

  const brokenEntries = allCompetitions.filter((c) =>
    BROKEN_URL_PATTERNS.some((pattern) => c.url.includes(pattern))
  )

  console.log(`[URL-Fix] Found ${brokenEntries.length} competitions with broken URLs out of ${allCompetitions.length} total`)

  if (brokenEntries.length === 0) {
    console.log('[URL-Fix] No broken URLs found!')
    await db.$disconnect()
    return
  }

  console.log('\n[URL-Fix] Broken URLs:')
  for (const entry of brokenEntries) {
    console.log(`  - ${entry.name}`)
    console.log(`    URL: ${entry.url}`)
    console.log(`    ID: ${entry.id}`)
  }

  if (!DRY_RUN) {
    // Add a note to the description so it's visible in the UI
    let fixed = 0
    for (const entry of brokenEntries) {
      await db.competition.update({
        where: { id: entry.id },
        data: {
          description: db.competition.fields.description
            ? undefined // keep existing description
            : 'Externer Link fehlt — bitte manuell ergänzen.',
        },
      })
      fixed++
    }
    console.log(`\n[URL-Fix] Flagged ${fixed} entries. Use the edit function in the app to add correct URLs.`)
  } else {
    console.log('\n[URL-Fix] Dry run complete. Run without --dry-run to apply changes.')
  }

  await db.$disconnect()
}

main().catch((error) => {
  console.error('[URL-Fix] Fatal error:', error)
  process.exit(1)
})
