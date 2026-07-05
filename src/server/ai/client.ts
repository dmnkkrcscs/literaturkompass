import Anthropic from '@anthropic-ai/sdk'

/** Central place for the Claude model IDs used across the app. */
export const MODELS = {
  /** Fast, cheap — used for extraction, recommendations, digests. */
  haiku: 'claude-haiku-4-5-20251001',
  /** Higher quality — used for submission analysis. */
  sonnet: 'claude-sonnet-5',
} as const

const globalForAnthropic = globalThis as unknown as { anthropic: Anthropic }

/**
 * Singleton instance of Anthropic client
 * Uses API key from ANTHROPIC_API_KEY environment variable
 */
export const anthropic =
  globalForAnthropic.anthropic ||
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 25_000, // 25s - fail fast before Cloudflare's 100s timeout
  })

// Prevent multiple instances during development
if (process.env.NODE_ENV !== 'production') {
  globalForAnthropic.anthropic = anthropic
}
