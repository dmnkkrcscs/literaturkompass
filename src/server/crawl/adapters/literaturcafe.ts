import type { CheerioAPI } from 'cheerio'
import type { CrawlAdapter, ExtractedLink } from './base'

/**
 * Adapter for literaturcafe.de - German literature cafe and resource portal
 */
export const literaturcafeAdapter: CrawlAdapter = {
  name: 'Literaturcafe',
  url: 'https://www.literaturcafe.de/rubrik/schreibwettbewerbe/',
  type: 'cheerio',

  getLinks($: CheerioAPI): ExtractedLink[] {
    const links: ExtractedLink[] = []

    // Literaturcafe has a dedicated section for writing competitions
    $('a').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      const text = $el.text().trim()

      if (href && text.length > 0) {
        // Filter for competition-related content
        const hasCompKeywords =
          /wettbewerb|schreibwettbewerb|ausschreibung|anthologie|contest|competition/i.test(
            text
          )

        // Exclude navigation and utility links
        const isNotNavigation =
          !/(menu|category|tag|author|comment|reply|login|register|home|about|feed)/i.test(
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
    $('script, style, nav, footer, .header, .sidebar, .related-posts').remove()

    // Get main content
    const mainContent = $('main, article, .content, .post').first().html()

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
