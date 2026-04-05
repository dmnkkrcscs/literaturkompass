import { anthropic } from './client'
import { ExtractionResponseSchema, ExtractionResult } from './schemas'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from './prompts'

/**
 * Pricing configuration for Claude models
 * Prices in USD per 1M tokens
 */
const MODEL_PRICING = {
  'claude-haiku-4-5-20251001': {
    input: 0.8,
    output: 4.0,
  },
}

/**
 * Convert token cost to cents
 */
function calculateCostCents(
  tokensUsed: number,
  outputTokens: number,
  modelId: string
): number {
  const pricing = MODEL_PRICING[modelId as keyof typeof MODEL_PRICING] || {
    input: 0.8,
    output: 4.0,
  }

  const inputTokens = tokensUsed - outputTokens
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const totalCostUSD = inputCost + outputCost

  // Convert USD to cents
  return Math.ceil(totalCostUSD * 100)
}

/**
 * Extract competition data from a web page using Claude Haiku
 *
 * @param url - The URL of the page (for logging/context)
 * @param rawText - The cleaned/extracted text content from the page
 * @returns Extraction result with success status, data, token usage, and cost
 */
export async function extractCompetitionFromUrl(
  url: string,
  rawText: string
): Promise<ExtractionResult> {
  try {
    // Prepare the user prompt with the page text
    const userPrompt = EXTRACTION_USER_PROMPT.replace('{pageText}', rawText)

    // Call Claude Haiku for cost-efficient extraction
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract the text content from the response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in Claude response')
      return {
        success: false,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        costCents: calculateCostCents(
          response.usage.input_tokens + response.usage.output_tokens,
          response.usage.output_tokens,
          'claude-haiku-4-5-20251001'
        ),
      }
    }

    // Parse the JSON response
    let parsedResponse
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError)
      return {
        success: false,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        costCents: calculateCostCents(
          response.usage.input_tokens + response.usage.output_tokens,
          response.usage.output_tokens,
          'claude-haiku-4-5-20251001'
        ),
      }
    }

    // Validate the response against the schema
    const validatedResponse = ExtractionResponseSchema.parse(parsedResponse)

    return {
      success: true,
      data: validatedResponse,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      costCents: calculateCostCents(
        response.usage.input_tokens + response.usage.output_tokens,
        response.usage.output_tokens,
        'claude-haiku-4-5-20251001'
      ),
      confidence: validatedResponse.confidence,
    }
  } catch (error) {
    console.error(`Error extracting competition from ${url}:`, error)
    return {
      success: false,
      tokensUsed: 0,
      costCents: 0,
    }
  }
}
