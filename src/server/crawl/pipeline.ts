import { db } from '@/lib/db'
import { extractCompetitionFromUrl } from '@/server/ai/extract'
import type { CrawlStatus } from '@prisma/client'
import { fetchWithCheerio } from './fetcher'
import { getAdapterForSource, getAllAdapters } from './adapters'
import type { Source } from '@prisma/client'

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
 * Check if a URL has been excluded from crawling
 *
 * @param url - URL to check
 * @returns True if URL should be excluded
 */
async function isUrlExcluded(url: string): Promise<boolean> {
  try {
    // Check if URL already exists in database
    const existing = await db.crawlLog.findFirst({
      where: { url },
      select: { id: true },
    })

    return !!existing
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

  const adapter = getAdapterForSource(source.url)
  if (!adapter) {
    console.error(`[Pipeline] No adapter found for source: ${source.url}`)
    return {
      sourceName: source.name,
      totalUrls: 0,
      successCount: 0,
      duplicateCount: 0,
      irrelevantCount: 0,
      failureCount: 1,
      processingTimeMs: Date.now() - startTime,
      costCents: 0,
    }
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

    // Process each link
    for (const link of links) {
      const result = await processPage(link.url, source)

      if (result.status === 'SUCCESS') {
        stats.successCount++
      } else if (result.status === 'DUPLICATE') {
        stats.duplicateCount++
      } else if (result.status === 'IRRELEVANT') {
        stats.irrelevantCount++
      } else {
        stats.failureCount++
      }

      stats.costCents += result.costCents

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
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

    // Crawl each source
    for (const source of sources) {
      const stats = await crawlSource(source)
      allStats.push(stats)
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
