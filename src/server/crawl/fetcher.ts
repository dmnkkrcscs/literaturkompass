import * as cheerio from 'cheerio'

/**
 * User-Agent string for HTTP requests
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Configuration for fetcher
 */
export interface FetcherConfig {
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}

/**
 * Default fetcher configuration
 */
const DEFAULT_CONFIG: FetcherConfig = {
  timeout: 15000,
  maxRetries: 3,
  retryDelay: 1000,
}

/**
 * Fetch HTML content from a URL using cheerio for parsing
 *
 * @param url - The URL to fetch
 * @param config - Optional fetcher configuration
 * @returns Parsed cheerio instance or null if fetch failed
 */
export async function fetchWithCheerio(
  url: string,
  config: FetcherConfig = {}
): Promise<cheerio.CheerioAPI | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= finalConfig.maxRetries!; attempt++) {
    try {
      console.log(
        `[Fetcher] Fetching ${url} (attempt ${attempt}/${finalConfig.maxRetries})`
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        finalConfig.timeout!
      )

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          'accept-language': 'en-US,en;q=0.9',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const body = await response.text()
      const $ = cheerio.load(body)
      console.log(`[Fetcher] Successfully fetched ${url}`)
      return $
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error))
      console.warn(
        `[Fetcher] Attempt ${attempt} failed for ${url}: ${lastError.message}`
      )

      // Wait before retrying (except on last attempt)
      if (attempt < finalConfig.maxRetries!) {
        await new Promise((resolve) =>
          setTimeout(resolve, finalConfig.retryDelay! * attempt)
        )
      }
    }
  }

  console.error(
    `[Fetcher] All ${finalConfig.maxRetries} attempts failed for ${url}`,
    lastError
  )
  return null
}

/**
 * Fetch with Playwright for JavaScript-rendered content
 * (Placeholder for future implementation)
 *
 * @param url - The URL to fetch
 * @returns Parsed cheerio instance or null if fetch failed
 */
export async function fetchWithPlaywright(
  url: string
): Promise<cheerio.CheerioAPI | null> {
  // TODO: Implement when Playwright is needed for JS-rendered sites
  console.warn(
    `[Fetcher] Playwright not yet implemented, falling back to cheerio for ${url}`
  )
  return fetchWithCheerio(url)
}
