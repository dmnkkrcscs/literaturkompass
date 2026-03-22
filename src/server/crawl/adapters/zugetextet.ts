import type { CheerioAPI } from 'cheerio'
import type { CrawlAdapter, ExtractedLink } from './base'

/**
 * Adapter for zugetextet.com - German writing competitions aggregator
 */
export const zugetextetAdapter: CrawlAdapter = {
  name: 'Zugetextet',
  url: 'https://zugetextet.com/ausschreibungen/',
  type: 'cheerio',

  getLinks($: CheerioAPI): ExtractedLink[] {
    const links: ExtractedLink[] = []

    // Look for competition links in the main content area
    // Zugetextet typically has a list of competitions with links
    $('a').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      const text = $el.text().trim()

      // Filter for competition-related links
      if (href && text.length > 0) {
        // Include links that contain common competition keywords
        const hasCompKeywords =
          /wettbewerb|ausschreibung|anthologie|schreibwettbewerb|competition/i.test(
            text
          )

        // Exclude navigation and utility links
        const isNotNavigation =
          !/(menu|category|tag|author|comment|reply|login|register|subscribe)/i.test(
            href
          )

        if (hasCompKeywords && isNotNavigation && !href.startsWith('#')) {
          // Ensure absolute URL
          const absoluteUrl = href.startsWith('http')
            ? href
            : new URL(href, this.url).toString()

          links.push({
            url: absoluteUrl,
            title: text,
          })
        }
      }
    })

    return [...new Map(links.map((item) => [item.url, item])).values()] // Deduplicate by URL
  },

  getContent($: CheerioAPI): string | undefined {
    // Remove script and style tags
    $('script, style, nav, footer, .header, .sidebar').remove()

    // Get main content
    const mainContent = $('main, article, .content, .post-content').first().html()

    if (!mainContent) {
      return undefined
    }

    // Convert to text and clean up
    const text = $(mainContent).text()
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit to 5000 chars for performance
  },
}
