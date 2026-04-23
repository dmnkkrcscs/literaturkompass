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
  createGenericAdapter,
} from './generic'

/**
 * Registry of all available crawl adapters
 * Maps source URLs to their corresponding adapters
 */
export const ADAPTERS: Record<string, CrawlAdapter> = {
  // exact-match registry; falls back to createGenericAdapter in getAdapterForSource
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
 * Get adapter for a source URL.
 *
 * Falls back to a generic adapter built from the source URL when no
 * source-specific adapter is registered. The generic adapter scans for
 * links containing competition-related keywords (wettbewerb, ausschreibung,
 * call, anthologie, …) which works well enough for most aggregator sites.
 *
 * @param url - Source URL
 * @param name - Source display name (used only for logging inside adapter)
 * @returns Adapter instance — always defined
 */
export function getAdapterForSource(url: string, name?: string): CrawlAdapter {
  const specific = ADAPTERS[url]
  if (specific) return specific

  // Derive a readable fallback name from the hostname if none provided
  let fallbackName = name
  if (!fallbackName) {
    try {
      fallbackName = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      fallbackName = url
    }
  }
  return createGenericAdapter(fallbackName, url)
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
