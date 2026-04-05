import { anthropic } from './client'
import { AnalysisResponseSchema, AnalysisResult } from './schemas'
import { ANALYSIS_SYSTEM_PROMPT, ANALYSIS_USER_PROMPT } from './prompts'

/**
 * Competition context for analysis
 */
interface CompetitionContext {
  name: string
  theme?: string
  genres: string[]
  maxLength?: number
  requirements?: string[]
}

/**
 * Analyze a submission text against competition requirements
 * Uses Claude Sonnet for higher quality analysis
 *
 * @param text - The user's submission text
 * @param competition - Competition details
 * @returns Detailed analysis result with scores and suggestions
 */
export async function analyzeSubmission(
  text: string,
  competition: CompetitionContext
): Promise<AnalysisResult> {
  try {
    // Calculate local text metrics
    const charCount = text.length
    const wordCount = text.trim().split(/\s+/).length
    const normPages = Math.ceil(charCount / 1500) // 1 Normseite = 1500 Zeichen

    // Prepare the user prompt with actual values
    const userPrompt = ANALYSIS_USER_PROMPT.replace(
      '{competitionName}',
      competition.name
    )
      .replace('{theme}', competition.theme || 'Keine Themenvorgabe')
      .replace('{genres}', competition.genres.join(', '))
      .replace('{maxLength}', competition.maxLength?.toString() || 'Keine Beschränkung')
      .replace('{requirements}', competition.requirements?.join(', ') || 'Keine besonderen Anforderungen')
      .replace('{userText}', text)

    // Call Claude Sonnet for better quality analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
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
        themeMatch: { score: 0, reason: 'Analyse konnte nicht durchgeführt werden' },
        genreMatch: { score: 0, reason: 'Analyse konnte nicht durchgeführt werden' },
        lengthOk: false,
        charCount,
        wordCount,
        normPages,
        overallFit: 0,
        suggestions: [],
        strengths: [],
      }
    }

    // Parse the JSON response
    let parsedResponse
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError)
      return {
        themeMatch: { score: 0, reason: 'JSON-Parsing fehlgeschlagen' },
        genreMatch: { score: 0, reason: 'JSON-Parsing fehlgeschlagen' },
        lengthOk: false,
        charCount,
        wordCount,
        normPages,
        overallFit: 0,
        suggestions: [],
        strengths: [],
      }
    }

    // Validate the response against the schema
    const validatedResponse = AnalysisResponseSchema.parse(parsedResponse)

    // Check if length is acceptable
    const lengthOk =
      !competition.maxLength || charCount <= competition.maxLength

    return {
      ...validatedResponse,
      lengthOk,
      charCount,
      wordCount,
      normPages,
    }
  } catch (error) {
    console.error('Error analyzing submission:', error)
    // Return default response with error state
    const charCount = text.length
    const wordCount = text.trim().split(/\s+/).length
    return {
      themeMatch: { score: 0, reason: 'Fehler bei der Analyse' },
      genreMatch: { score: 0, reason: 'Fehler bei der Analyse' },
      lengthOk: false,
      charCount,
      wordCount,
      normPages: Math.ceil(charCount / 1500),
      overallFit: 0,
      suggestions: ['Bitte versuchen Sie es später erneut'],
      strengths: [],
    }
  }
}
