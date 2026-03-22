/**
 * Adapter registry - Exports all available crawl adapters
 */

import type { CrawlAdapter } from './base'
import { zugetextetAdapter } from './zugetextet'
import { kreativSchreibenAdapter } from './kreativ-schreiben'
import { autorenweltAdapter } from './autorenwelt'
import { literaturcafeAdapter } from './literaturcafe'
import {
  epubliAdapter,
  treffpunktschreibenAdapter,
  wirErschaffenWeltenAdapter,
  literaturportAdapter,
  federweltAdapter,
  schreiblustVerlagAdapter,
  papierfreschenAdapter,
} from './generic'

/**
 * Registry of all available crawl adapters
 * Maps source URLs to their corresponding adapters
 */
export const ADAPTERS: Record<string, CrawlAdapter> = {
  'https://zugetextet.com/ausschreibungen/': zugetextetAdapter,
  'https://kreativ-schreiben-lernen.de/wettbewerbe-preise-etc/':
    kreativSchreibenAdapter,
  'https://www.autorenwelt.de/verzeichnis/aufrufe': autorenweltAdapter,
  'https://www.literaturcafe.de/rubrik/schreibwettbewerbe/':
    literaturcafeAdapter,
  'https://www.epubli.com/wissen/schreibwettbewerbe': epubliAdapter,
  'https://treffpunktschreiben.at/wettbewerbe/': treffpunktschreibenAdapter,
  'https://wir-erschaffen-welten.net/aktivitaeten/aktuelle-ausschreibungen/':
    wirErschaffenWeltenAdapter,
  'https://www.literaturport.de/wettbewerbe/': literaturportAdapter,
  'https://www.federwelt.de/wettbewerbe/': federweltAdapter,
  'https://www.schreiblust-verlag.de/anthologie-ausschreibungen/':
    schreiblustVerlagAdapter,
  'https://www.papierfresserchen.eu/': papierfreschenAdapter,
}

/**
 * Get adapter for a source URL
 *
 * @param url - Source URL
 * @returns Adapter instance or undefined if not found
 */
export function getAdapterForSource(url: string): CrawlAdapter | undefined {
  return ADAPTERS[url]
}

/**
 * Get all available adapters
 *
 * @returns Array of all adapter instances
 */
export function getAllAdapters(): CrawlAdapter[] {
  return Object.values(ADAPTERS)
}

/**
 * Export base types
 */
export type { CrawlAdapter, ExtractedLink } from './base'
