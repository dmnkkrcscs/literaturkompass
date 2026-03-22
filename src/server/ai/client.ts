import Anthropic from '@anthropic-ai/sdk'

const globalForAnthropic = globalThis as unknown as { anthropic: Anthropic }

/**
 * Singleton instance of Anthropic client
 * Uses API key from ANTHROPIC_API_KEY environment variable
 */
export const anthropic =
  globalForAnthropic.anthropic ||
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

// Prevent multiple instances during development
if (process.env.NODE_ENV !== 'production') {
  globalForAnthropic.anthropic = anthropic
}
