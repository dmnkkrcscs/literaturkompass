import type { CheerioAPI } from 'cheerio'

/**
 * Link extracted from a page by an adapter
 */
export interface ExtractedLink {
  url: string
  title: string
}

/**
 * Base interface for crawl adapters
 * Each adapter implements source-specific logic for extracting competition links
 */
export interface CrawlAdapter {
  /**
   * Human-readable name of the source
   */
  name: string

  /**
   * Base URL of the source
   */
  url: string

  /**
   * Type of fetcher to use for this source
   * 'cheerio': Simple HTML parsing
   * 'playwright': Headless browser (for JS-rendered content)
   */
  type: 'cheerio' | 'playwright'

  /**
   * Extract competition links from a page
   * Adapters should implement source-specific CSS selectors or parsing logic
   *
   * @param $ - Parsed HTML content (cheerio instance)
   * @returns Array of extracted links with URL and title
   */
  getLinks($: CheerioAPI): ExtractedLink[]

  /**
   * Optional: Extract main content from a specific competition page
   * Used to get cleaned text content for AI extraction
   *
   * @param $ - Parsed HTML content (cheerio instance)
   * @returns Extracted text content, or undefined if not implemented
   */
  getContent?($: CheerioAPI): string | undefined
}
