import { anthropic } from './client'
import { RecommendationResponseSchema, Recommendation } from './schemas'
import { RECOMMENDATION_SYSTEM_PROMPT, RECOMMENDATION_USER_PROMPT } from './prompts'

/**
 * Competition data for recommendation
 */
interface CompetitionData {
  id: string
  name: string
  theme?: string
  genres: string[]
  maxLength?: number
  description?: string
}

/**
 * User profile built from their submission history
 */
interface UserProfile {
  topGenres: string[]
  preferredThemes: string[]
  avgTextLength: number
  successfulPatterns: string[]
  submissionCount: number
  successRate: number
}

/**
 * Get recommendations for competitions based on user profile
 * Uses Claude Haiku for cost-efficient batch scoring
 *
 * @param competitions - Array of competition data to score
 * @param userProfile - User profile with preferences and history
 * @returns Array of recommendations with scores and reasons
 */
export async function getRecommendations(
  competitions: CompetitionData[],
  userProfile: UserProfile
): Promise<Recommendation[]> {
  try {
    // Format user profile for the prompt
    const profileText = `
Bevorzugte Genres: ${userProfile.topGenres.join(', ')}
Häufige Themen: ${userProfile.preferredThemes.join(', ')}
Durchschnittliche Textlänge: ${userProfile.avgTextLength} Zeichen
Erfolgreiche Muster: ${userProfile.successfulPatterns.join(', ')}
Einreichungen insgesamt: ${userProfile.submissionCount}
Erfolgsquote: ${(userProfile.successRate * 100).toFixed(1)}%
    `.trim()

    // Format competitions for the prompt
    const competitionsText = competitions
      .map(
        (comp) => `
ID: ${comp.id}
Name: ${comp.name}
Thema: ${comp.theme || 'Keine Themenvorgabe'}
Genres: ${comp.genres.join(', ')}
Max. Länge: ${comp.maxLength ? `${comp.maxLength} Zeichen` : 'Keine Beschränkung'}
Beschreibung: ${comp.description || 'Keine Details verfügbar'}
      `.trim()
      )
      .join('\n---\n')

    // Prepare the user prompt with actual values
    const userPrompt = RECOMMENDATION_USER_PROMPT.replace(
      '{profile}',
      profileText
    ).replace('{competitions}', competitionsText)

    // Call Claude Haiku for cost-efficient recommendations
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: RECOMMENDATION_SYSTEM_PROMPT,
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
      return []
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
      return []
    }

    // Validate the response against the schema
    const validatedResponse = RecommendationResponseSchema.parse(parsedResponse)

    return validatedResponse.recommendations
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return []
  }
}

/**
 * Score a single competition for a user
 * Simpler version for when you only need one score
 *
 * @param competition - Competition to score
 * @param userProfile - User profile for context
 * @returns Single recommendation
 */
export async function scoreCompetition(
  competition: CompetitionData,
  userProfile: UserProfile
): Promise<Recommendation | null> {
  const recommendations = await getRecommendations([competition], userProfile)
  return recommendations.length > 0 ? recommendations[0] : null
}
