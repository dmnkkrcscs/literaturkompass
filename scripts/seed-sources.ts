import { db } from '../src/lib/db'

const AGGREGATOR_SOURCES = [
  {
    name: 'Kreatif-Schreiben-Lernen.de',
    url: 'kreativ-schreiben-lernen.de',
  },
  {
    name: 'epubli',
    url: 'epubli.com',
  },
  {
    name: 'Treffpunkt Schreiben',
    url: 'treffpunktschreiben.at',
  },
  {
    name: 'Autorenwelt',
    url: 'autorenwelt.de',
  },
  {
    name: 'Wir erschaffen Welten',
    url: 'wir-erschaffen-welten.net',
  },
  {
    name: 'Literaturcafe',
    url: 'literaturcafe.de',
  },
  {
    name: 'Papierfresserchen',
    url: 'papierfresserchen.eu',
  },
  {
    name: 'Literaturport',
    url: 'literaturport.de',
  },
  {
    name: 'zugetextet',
    url: 'zugetextet.com',
  },
  {
    name: 'Federwelt',
    url: 'federwelt.de',
  },
  {
    name: 'Schreiblust Verlag',
    url: 'schreiblust-verlag.de',
  },
]

async function main() {
  console.log('\n📚 Seeding Aggregator Sources...\n')

  let created = 0
  let skipped = 0

  for (const source of AGGREGATOR_SOURCES) {
    try {
      // Check if source already exists
      const existing = await db.source.findUnique({
        where: { url: source.url },
      })

      if (existing) {
        console.log(`  ⊘ Already exists: ${source.name}`)
        skipped++
      } else {
        // Create new source
        await db.source.create({
          data: {
            name: source.name,
            url: source.url,
            type: 'AGGREGATOR',
            isActive: true,
          },
        })
        console.log(`  ✓ Created: ${source.name}`)
        created++
      }
    } catch (error) {
      console.error(
        `  ✗ Error creating source ${source.name}:`,
        error instanceof Error ? error.message : error,
      )
      skipped++
    }
  }

  const totalCount = await db.source.count()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✨ Seeding Summary\n`)
  console.log(`Sources created:   ${created}`)
  console.log(`Already existed:   ${skipped}`)
  console.log(`Total in database: ${totalCount}`)
  console.log(`${'='.repeat(60)}\n`)

  await db.$disconnect()
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
