import type { CheerioAPI } from 'cheerio'
import type { CrawlAdapter, ExtractedLink } from './base'

/**
 * Adapter for kreativ-schreiben-lernen.de - German creative writing site
 */
export const kreativSchreibenAdapter: CrawlAdapter = {
  name: 'Kreativ Schreiben Lernen',
  url: 'https://kreativ-schreiben-lernen.de/wettbewerbe-preise-etc/',
  type: 'cheerio',

  getLinks($: CheerioAPI): ExtractedLink[] {
    const links: ExtractedLink[] = []

    // kreativ-schreiben-lernen.de has competitions listed with links
    $('a').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      const text = $el.text().trim()

      if (href && text.length > 0) {
        // Filter for competition-related links
        const hasCompKeywords =
          /wettbewerb|preise|ausschreibung|contest|competition|anthologie/i.test(
            text
          )

        // Exclude navigation and utility links
        const isNotNavigation =
          !/(menu|category|tag|author|comment|reply|login|register|home|about)/i.test(
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
    const mainContent = $('main, article, .content, .entry-content').first()
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
