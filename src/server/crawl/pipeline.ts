import { db } from '@/lib/db'
import { extractCompetitionFromUrl } from '@/server/ai/extract'
type CrawlStatus = 'SUCCESS' | 'FAILED' | 'DUPLICATE' | 'IRRELEVANT'
import { fetchWithCheerio } from './fetcher'
import { getAdapterForSource, getAllAdapters, ADAPTERS } from './adapters'
// Source type defined locally to avoid Prisma client import at build time
interface Source { id: string; name: string; url: string }

/** Normalisierte Domain aus URL — leerer String, wenn URL ungültig */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Prüft, ob die Domain einer URL als unseriöser Verlag geblockt ist. */
async function isPublisherBlocked(url: string): Promise<boolean> {
  const domain = extractDomain(url)
  if (!domain) return false
  const blocked = await db.blockedPublisher.findUnique({
    where: { domain },
    select: { blocked: true },
  })
  return blocked?.blocked === true
}

/**
 * Statistics from a crawl session
 */
export interface CrawlStats {
  sourceName: string
  totalUrls: number
  successCount: number
  duplicateCount: number
  irrelevantCount: number
  failureCount: number
  processingTimeMs: number
  costCents: number
}

/**
 * Result from processing a single page
 */
interface ProcessingResult {
  status: CrawlStatus
  errorMessage?: string
  extractedData?: Record<string, unknown>
  costCents: number
  processingMs: number
}

/**
 * Clean HTML by removing scripts, styles, navigation, footer, and normalizing whitespace
 *
 * @param html - Raw HTML string
 * @returns Cleaned text content
 */
export function cleanHtml(html: string): string {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove common navigation and footer elements
  cleaned = cleaned
    .replace(/<nav\b[^>]*(?:(?!<\/nav>)[^])*<\/nav>/gi, '')
    .replace(/<footer\b[^>]*(?:(?!<\/footer>)[^])*<\/footer>/gi, '')
    .replace(/<header\b[^>]*(?:(?!<\/header>)[^])*<\/header>/gi, '')

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ')

  // Normalize whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()

  return cleaned
}

/**
 * Check if a URL should be skipped (already successfully processed recently,
 * or already linked to an existing competition).
 *
 * Rules:
 *  - SUCCESS log newer than SUCCESS_TTL_DAYS → skip (we already extracted it)
 *  - A Competition with this sourceUrl exists → skip
 *  - Otherwise (including prior FAILED / IRRELEVANT / old SUCCESS) → re-crawl
 *
 * @param url - URL to check
 * @returns True if URL should be skipped
 */
const SUCCESS_TTL_DAYS = 7

async function isUrlExcluded(url: string): Promise<boolean> {
  try {
    // If we've already saved a competition for this URL, skip it.
    const competition = await db.competition.findFirst({
      where: { url },
      select: { id: true },
    })
    if (competition) return true

    // Otherwise: only skip if we have a RECENT successful crawl log.
    // Old successes, and any FAILED/IRRELEVANT/DUPLICATE logs, should be retried
    // — the extraction might have failed silently or the page may have changed.
    const cutoff = new Date(Date.now() - SUCCESS_TTL_DAYS * 24 * 60 * 60 * 1000)
    const recentSuccess = await db.crawlLog.findFirst({
      where: {
        url,
        status: 'SUCCESS',
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    })

    return !!recentSuccess
  } catch (error) {
    console.error(`Error checking if URL is excluded: ${url}`, error)
    return false
  }
}

/**
 * Process a single page: fetch, clean, extract, and save to database
 *
 * @param url - URL to process
 * @param source - Source configuration
 * @returns Processing result with status and metadata
 */
async function processPage(
  url: string,
  source: Source
): Promise<ProcessingResult> {
  const startTime = Date.now()

  try {
    // Check if URL already exists in database
    if (await isUrlExcluded(url)) {
      console.log(`[Pipeline] URL already crawled: ${url}`)
      return {
        status: 'DUPLICATE',
        costCents: 0,
        processingMs: Date.now() - startTime,
      }
    }

    // Fetch the page
    const $ = await fetchWithCheerio(url)
    if (!$ || !$.html()) {
      throw new Error('Failed to fetch or parse HTML')
    }

    // Clean HTML
    const cleanedText = cleanHtml($.html()!)

    // Extract competition data using Claude
    const extractionResult = await extractCompetitionFromUrl(url, cleanedText)

    // If extraction wasn't successful, log it and return
    if (!extractionResult.success || !extractionResult.data) {
      console.log(`[Pipeline] Extraction not relevant for: ${url}`)
      await db.crawlLog.create({
        data: {
          sourceId: source.id,
          url,
          status: 'IRRELEVANT',
          processingMs: Date.now() - startTime,
        },
      })

      return {
        status: 'IRRELEVANT',
        costCents: extractionResult.costCents,
        processingMs: Date.now() - startTime,
      }
    }

    // Check if extraction is actually relevant
    if (!extractionResult.data.relevant) {
      console.log(
        `[Pipeline] Page not relevant according to extraction: ${url}`
      )
      await db.crawlLog.create({
        data: {
          sourceId: source.id,
          url,
          status: 'IRRELEVANT',
          processingMs: Date.now() - startTime,
        },
      })

      return {
        status: 'IRRELEVANT',
        costCents: extractionResult.costCents,
        processingMs: Date.now() - startTime,
      }
    }

    // Wenn die Domain als unseriöser Verlag geblockt ist, legen wir den
    // Wettbewerb zwar an (für die Historie / Restore), aber direkt als
    // dismissed — er taucht dann nicht in der Triage auf.
    const publisherBlocked = await isPublisherBlocked(url)
    if (publisherBlocked) {
      console.log(`[Pipeline] Auto-dismissing — publisher blocked: ${url}`)
    }

    // Create or update competition in database
    const competition = await db.competition.upsert({
      where: { url },
      create: {
        name: extractionResult.data.data?.name || 'Unknown',
        type: 'WETTBEWERB',
        sourceId: source.id,
        url,
        organizer: extractionResult.data.data?.organizer,
        deadline: extractionResult.data.data?.deadline
          ? new Date(extractionResult.data.data.deadline)
          : null,
        theme: extractionResult.data.data?.theme,
        genres: extractionResult.data.data?.genres || [],
        prize: extractionResult.data.data?.prize,
        maxLength: extractionResult.data.data?.maxLength?.toString(),
        requirements: extractionResult.data.data?.requirements?.join('; '),
        ageRestriction: extractionResult.data.data?.ageRestriction,
        regionRestriction: extractionResult.data.data?.regionRestriction,
        fee: extractionResult.data.data?.fee,
        description: extractionResult.data.data?.description,
        relevanceScore: extractionResult.data.data?.relevanceScore,
        aiExtracted: true,
        aiConfidence: extractionResult.confidence,
        rawText: cleanedText.substring(0, 50000), // Store raw text for re-processing
        dismissed: publisherBlocked,
      },
      update: {
        name: extractionResult.data.data?.name || undefined,
        organizer: extractionResult.data.data?.organizer,
        deadline: extractionResult.data.data?.deadline
          ? new Date(extractionResult.data.data.deadline)
          : undefined,
        theme: extractionResult.data.data?.theme,
        genres: extractionResult.data.data?.genres || [],
        prize: extractionResult.data.data?.prize,
        maxLength: extractionResult.data.data?.maxLength?.toString(),
        requirements: extractionResult.data.data?.requirements?.join('; '),
        ageRestriction: extractionResult.data.data?.ageRestriction,
        regionRestriction: extractionResult.data.data?.regionRestriction,
        fee: extractionResult.data.data?.fee,
        description: extractionResult.data.data?.description,
        relevanceScore: extractionResult.data.data?.relevanceScore,
        aiExtracted: true,
        aiConfidence: extractionResult.confidence,
        rawText: cleanedText.substring(0, 50000),
        updatedAt: new Date(),
      },
    })

    // Log successful crawl
    await db.crawlLog.create({
      data: {
        sourceId: source.id,
        competitionId: competition.id,
        url,
        status: 'SUCCESS',
        extractedData: extractionResult.data.data as any,
        processingMs: Date.now() - startTime,
      },
    })

    console.log(
      `[Pipeline] Successfully processed: ${url} -> ${competition.name}`
    )

    return {
      status: 'SUCCESS',
      extractedData: extractionResult.data.data as Record<string, unknown>,
      costCents: extractionResult.costCents,
      processingMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Pipeline] Error processing ${url}:`, errorMessage)

    // Log failed crawl
    try {
      await db.crawlLog.create({
        data: {
          sourceId: source.id,
          url,
          status: 'FAILED',
          errorMessage,
          processingMs: Date.now() - startTime,
        },
      })
    } catch (logError) {
      console.error('Error logging crawl failure:', logError)
    }

    return {
      status: 'FAILED',
      errorMessage,
      costCents: 0,
      processingMs: Date.now() - startTime,
    }
  }
}

/**
 * Crawl a single source and extract all competition links
 *
 * @param source - Source to crawl
 * @returns Statistics from the crawl session
 */
export async function crawlSource(source: Source): Promise<CrawlStats> {
  console.log(`[Pipeline] Starting crawl for source: ${source.name}`)
  const startTime = Date.now()

  // Always returns an adapter — generic fallback is used when no
  // source-specific adapter is registered.
  const adapter = getAdapterForSource(source.url, source.name)
  if (!ADAPTERS[source.url]) {
    console.log(
      `[Pipeline] Using generic adapter for source: ${source.name} (${source.url})`
    )
  }

  const stats: CrawlStats = {
    sourceName: source.name,
    totalUrls: 0,
    successCount: 0,
    duplicateCount: 0,
    irrelevantCount: 0,
    failureCount: 0,
    processingTimeMs: 0,
    costCents: 0,
  }

  try {
    // Fetch the source page
    const $ = await fetchWithCheerio(source.url)
    if (!$) {
      throw new Error(`Failed to fetch source page: ${source.url}`)
    }

    // Extract links using the adapter
    const links = adapter.getLinks($)
    console.log(
      `[Pipeline] Found ${links.length} potential competition links in ${source.name}`
    )

    stats.totalUrls = links.length

    // Process links in parallel batches of 5 for much faster crawling
    const BATCH_SIZE = 5
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((link) => processPage(link.url, source))
      )

      for (const result of results) {
        if (result.status === 'rejected') {
          stats.failureCount++
          console.error('[Pipeline] Batch item failed:', result.reason)
          continue
        }

        const { value } = result
        if (value.status === 'SUCCESS') {
          stats.successCount++
        } else if (value.status === 'DUPLICATE') {
          stats.duplicateCount++
        } else if (value.status === 'IRRELEVANT') {
          stats.irrelevantCount++
        } else {
          stats.failureCount++
        }

        stats.costCents += value.costCents
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < links.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Update source metadata
    await db.source.update({
      where: { id: source.id },
      data: {
        lastCrawl: new Date(),
        totalCrawls: { increment: 1 },
        successRate:
          stats.totalUrls > 0
            ? stats.successCount / stats.totalUrls
            : 0,
      },
    })
  } catch (error) {
    console.error(`[Pipeline] Error crawling source ${source.name}:`, error)
    stats.failureCount++
  }

  stats.processingTimeMs = Date.now() - startTime
  console.log(
    `[Pipeline] Completed crawl for ${source.name}: ${stats.successCount} success, ${stats.duplicateCount} duplicate, ${stats.irrelevantCount} irrelevant, ${stats.failureCount} failed`
  )

  return stats
}

/**
 * Run through all active sources and crawl them
 *
 * @returns Array of crawl statistics for each source
 */
export async function crawlAllSources(): Promise<CrawlStats[]> {
  console.log('[Pipeline] Starting crawl of all sources')
  const allStats: CrawlStats[] = []

  try {
    // Get all active sources
    const sources = await db.source.findMany({
      where: { isActive: true },
    })

    if (sources.length === 0) {
      console.warn('[Pipeline] No active sources found')
      return allStats
    }

    console.log(
      `[Pipeline] Found ${sources.length} active sources to crawl`
    )

    // Crawl sources in parallel batches of 3
    // (each source already does internal batching, so keep this conservative)
    const SOURCE_BATCH_SIZE = 3
    for (let i = 0; i < sources.length; i += SOURCE_BATCH_SIZE) {
      const batch = sources.slice(i, i + SOURCE_BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((source) => crawlSource(source))
      )
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allStats.push(result.value)
        } else {
          console.error('[Pipeline] Source crawl failed:', result.reason)
        }
      }
    }
  } catch (error) {
    console.error('[Pipeline] Error in crawlAllSources:', error)
  }

  // Log overall summary
  const totalCost = allStats.reduce((sum, s) => sum + s.costCents, 0)
  const totalSuccess = allStats.reduce((sum, s) => sum + s.successCount, 0)
  const totalDuplicate = allStats.reduce((sum, s) => sum + s.duplicateCount, 0)
  const totalIrrelevant = allStats.reduce((sum, s) => sum + s.irrelevantCount, 0)
  const totalFailed = allStats.reduce((sum, s) => sum + s.failureCount, 0)

  console.log('[Pipeline] === Crawl Session Complete ===')
  console.log(`[Pipeline] Total cost: ${(totalCost / 100).toFixed(2)} USD`)
  console.log(
    `[Pipeline] Results: ${totalSuccess} success, ${totalDuplicate} duplicate, ${totalIrrelevant} irrelevant, ${totalFailed} failed`
  )

  return allStats
}
