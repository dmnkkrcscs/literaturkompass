import type { CheerioAPI } from 'cheerio'
import type { CrawlAdapter, ExtractedLink } from './base'

/**
 * Generic adapter for multiple sources with similar structure
 * Used for: epubli, treffpunktschreiben, wir-erschaffen-welten, literaturport, federwelt, schreiblust-verlag, papierfresserchen
 */
function createGenericAdapter(
  name: string,
  url: string,
  type: 'cheerio' | 'playwright' = 'cheerio'
): CrawlAdapter {
  return {
    name,
    url,
    type,

    getLinks($: CheerioAPI): ExtractedLink[] {
      const links: ExtractedLink[] = []

      // Generic extraction strategy that works for most sites
      $('a').each((_, el) => {
        const $el = $(el)
        const href = $el.attr('href')
        const text = $el.text().trim()

        if (href && text.length > 0) {
          // Filter for competition-related content
          const hasCompKeywords =
            /wettbewerb|ausschreibung|call|submission|competition|contest|anthologie|publication|schreibwettbewerb|aufrufe|aufruf|ausschreibungen/i.test(
              text
            )

          // Exclude navigation, utility, and social links
          const isNotNavigation =
            !/(menu|category|tag|author|comment|reply|login|register|home|about|feed|social|share|twitter|facebook|instagram|pinterest|linkedin)/i.test(
              href
            )

          // Exclude external links to unrelated sites
          const isRelevantDomain = !/(facebook|twitter|instagram|reddit|youtube|tiktok)/i.test(
            href
          )

          if (
            hasCompKeywords &&
            isNotNavigation &&
            isRelevantDomain &&
            !href.startsWith('#')
          ) {
            // Ensure absolute URL
            const absoluteUrl = href.startsWith('http')
              ? href
              : new URL(href, url).toString()

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
      // Remove unwanted elements
      $(
        'script, style, nav, footer, .header, .sidebar, .navigation, .related-posts, .comments'
      ).remove()

      // Try to find main content in common selectors
      const mainContent = $(
        'main, article, .content, .post-content, .entry-content, .page-content'
      )
        .first()
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
}

// Specific adapters for each source
export const epubliAdapter = createGenericAdapter(
  'Epubli',
  'https://www.epubli.com/wissen/schreibwettbewerbe'
)

export const treffpunktschreibenAdapter = createGenericAdapter(
  'Treffpunkt Schreiben',
  'https://treffpunktschreiben.at/wettbewerbe/'
)

export const wirErschaffenWeltenAdapter = createGenericAdapter(
  'Wir Erschaffen Welten',
  'https://wir-erschaffen-welten.net/aktivitaeten/aktuelle-ausschreibungen/'
)

export const literaturportAdapter = createGenericAdapter(
  'Literaturport',
  'https://www.literaturport.de/wettbewerbe/'
)

export const federweltAdapter = createGenericAdapter(
  'Federwelt',
  'https://www.federwelt.de/wettbewerbe/'
)

export const schreiblustVerlagAdapter = createGenericAdapter(
  'Schreiblust Verlag',
  'https://www.schreiblust-verlag.de/anthologie-ausschreibungen/'
)

export const papierfreschenAdapter = createGenericAdapter(
  'Papierfresserchen',
  'https://www.papierfresserchen.eu/'
)
