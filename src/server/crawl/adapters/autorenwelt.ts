import type { CheerioAPI } from 'cheerio'
import type { CrawlAdapter, ExtractedLink } from './base'

/**
 * Adapter for autorenwelt.de - German authors portal
 */
export const autorenweltAdapter: CrawlAdapter = {
  name: 'Autorenwelt',
  url: 'https://www.autorenwelt.de/verzeichnis/aufrufe',
  type: 'cheerio',

  getLinks($: CheerioAPI): ExtractedLink[] {
    const links: ExtractedLink[] = []

    // Autorenwelt lists writing opportunities and competitions
    $('a').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      const text = $el.text().trim()

      if (href && text.length > 0) {
        // Filter for competition/call-related links
        const hasCompKeywords =
          /wettbewerb|ausschreibung|aufrufe|aufruf|call|submission|anthologie|schreibwettbewerb/i.test(
            text
          )

        // Exclude navigation and utility links
        const isNotNavigation =
          !/(menu|category|tag|author|comment|reply|login|register|home|about|profile)/i.test(
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
    $('script, style, nav, footer, .header, .sidebar, .navigation').remove()

    // Get main content
    const mainContent = $('main, article, .content, .listing-details').first()
      .html()

    if (!mainContent) {
      return undefined
    }

    // Convert to text and clean up
    const text = $(mainContent).text()
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000)
  },
}
