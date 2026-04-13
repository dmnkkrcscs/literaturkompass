import { db } from '@/lib/db'
import { ADAPTERS } from './adapters'

/**
 * Source definitions with correct full URLs matching the adapter registry.
 * The old seed script used bare domains which didn't match adapter keys,
 * causing getAdapterForSource() to return undefined and crawls to silently fail.
 */
const SOURCES: Array<{ name: string; url: string }> = [
  { name: 'zugetextet', url: 'https://zugetextet.com/ausschreibungen/' },
  { name: 'Kreativ-Schreiben-Lernen.de', url: 'https://kreativ-schreiben-lernen.de/wettbewerbe-preise-etc/' },
  { name: 'Autorenwelt', url: 'https://www.autorenwelt.de/verzeichnis/aufrufe' },
  { name: 'Literaturcafe', url: 'https://www.literaturcafe.de/rubrik/schreibwettbewerbe/' },
  { name: 'epubli', url: 'https://www.epubli.com/wissen/schreibwettbewerbe' },
  { name: 'Treffpunkt Schreiben', url: 'https://treffpunktschreiben.at/wettbewerbe/' },
  { name: 'Wir erschaffen Welten', url: 'https://wir-erschaffen-welten.net/aktivitaeten/aktuelle-ausschreibungen/' },
  { name: 'Literaturport', url: 'https://www.literaturport.de/wettbewerbe/' },
  { name: 'Federwelt', url: 'https://www.federwelt.de/wettbewerbe/' },
  { name: 'Schreiblust Verlag', url: 'https://www.schreiblust-verlag.de/anthologie-ausschreibungen/' },
  { name: 'Papierfresserchen', url: 'https://www.papierfresserchen.eu/' },
]

/**
 * Ensures all known aggregator sources exist in the database.
 * Also fixes old entries that have bare-domain URLs by updating them
 * to the full URLs that match the adapter registry.
 *
 * Safe to call on every worker startup — uses upsert to avoid duplicates.
 */
export async function autoSeedSources(): Promise<void> {
  console.log('[AutoSeed] Checking sources...')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const source of SOURCES) {
    try {
      // Check if source with this exact URL already exists
      const existing = await db.source.findUnique({
        where: { url: source.url },
      })

      if (existing) {
        skipped++
        continue
      }

      // Check if there's an old entry with a bare domain URL
      // e.g. "kreativ-schreiben-lernen.de" instead of "https://kreativ-schreiben-lernen.de/wettbewerbe-preise-etc/"
      const domain = new URL(source.url).hostname.replace('www.', '')
      const oldEntry = await db.source.findFirst({
        where: {
          url: { contains: domain },
          NOT: { url: source.url },
        },
      })

      if (oldEntry) {
        // Update the old entry with the correct full URL
        await db.source.update({
          where: { id: oldEntry.id },
          data: {
            url: source.url,
            name: source.name,
            isActive: true,
          },
        })
        console.log(`[AutoSeed] Updated URL for ${source.name}: ${oldEntry.url} -> ${source.url}`)
        updated++
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
        console.log(`[AutoSeed] Created source: ${source.name}`)
        created++
      }
    } catch (error) {
      console.error(`[AutoSeed] Error for ${source.name}:`, error instanceof Error ? error.message : error)
    }
  }

  const total = await db.source.count()
  console.log(`[AutoSeed] Done: ${created} created, ${updated} updated, ${skipped} unchanged. Total sources: ${total}`)
}
