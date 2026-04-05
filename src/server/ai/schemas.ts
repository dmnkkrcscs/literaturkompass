import { z } from 'zod'

/**
 * Schema for competition data extraction from web pages
 */
export const ExtractionResponseSchema = z.object({
  relevant: z.boolean().describe('Whether the page contains relevant competition data'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
  reason: z.string().optional().describe('Explanation why the page is/is not relevant'),
  data: z
    .object({
      name: z.string().describe('Name of the competition'),
      type: z.enum(['text', 'poetry', 'drama', 'mixed']).describe('Type of competition'),
      organizer: z.string().describe('Organization running the competition'),
      deadline: z.string().describe('Submission deadline (ISO date or description)'),
      theme: z.string().optional().describe('Theme or topic of the competition'),
      genres: z.array(z.string()).describe('Accepted genres'),
      prize: z.string().optional().describe('Prize or award'),
      maxLength: z.number().optional().describe('Maximum text length in characters'),
      requirements: z.array(z.string()).optional().describe('Special requirements'),
      description: z.string().optional().describe('Full description of the competition'),
      fee: z.string().optional().describe('Submission fee if any'),
      ageRestriction: z.string().optional().describe('Age restrictions if any'),
      regionRestriction: z.string().optional().describe('Geographic restrictions if any'),
      relevanceScore: z.number().min(0).max(100).describe('Relevance score 0-100'),
    })
    .optional()
    .describe('Extracted competition data'),
})

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>

/**
 * Schema for submission analysis results
 */
export const AnalysisResponseSchema = z.object({
  themeMatch: z.object({
    score: z.number().min(0).max(100).describe('Theme match score 0-100'),
    reason: z.string().describe('Explanation of the score'),
  }),
  genreMatch: z.object({
    score: z.number().min(0).max(100).describe('Genre match score 0-100'),
    reason: z.string().describe('Explanation of the score'),
  }),
  lengthOk: z.boolean().describe('Whether the text length is acceptable'),
  overallFit: z.number().min(0).max(100).describe('Overall fit score 0-100'),
  suggestions: z
    .array(z.string())
    .describe('Suggestions for improvement'),
  strengths: z
    .array(z.string())
    .describe('Identified strengths of the submission'),
})

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>

/**
 * Schema for recommendation scoring
 */
export const RecommendationResponseSchema = z.object({
  recommendations: z
    .array(
      z.object({
        competitionId: z.string().describe('ID of the competition'),
        score: z.number().min(0).max(100).describe('Recommendation score 0-100'),
        reasoning: z.string().describe('Why this competition is recommended'),
        matchedAspects: z
          .array(z.string())
          .describe('Which user preferences match'),
      })
    )
    .describe('List of scored recommendations'),
})

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>

/**
 * Extended analysis result including local calculations
 */
export const AnalysisResultSchema = z.object({
  themeMatch: z.object({
    score: z.number().min(0).max(100),
    reason: z.string(),
  }),
  genreMatch: z.object({
    score: z.number().min(0).max(100),
    reason: z.string(),
  }),
  lengthOk: z.boolean(),
  charCount: z.number().describe('Character count of the text'),
  wordCount: z.number().describe('Word count of the text'),
  normPages: z.number().describe('German "Normseite" pages (1 per 1500 characters)'),
  overallFit: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  strengths: z.array(z.string()),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

/**
 * Extraction result including metadata
 */
export const ExtractionResultSchema = z.object({
  success: z.boolean().describe('Whether extraction was successful'),
  data: ExtractionResponseSchema.optional(),
  tokensUsed: z.number().describe('Number of tokens used in the API call'),
  costCents: z.number().describe('Cost in cents (1/100 of currency unit)'),
  confidence: z.number().min(0).max(1).optional(),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>

/**
 * Recommendation with metadata
 */
export const RecommendationSchema = z.object({
  competitionId: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  matchedAspects: z.array(z.string()),
})

export type Recommendation = z.infer<typeof RecommendationSchema>
