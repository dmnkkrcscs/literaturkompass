/**
 * Literaturkompass AI Module
 * Central exports for all AI-related functionality
 */

// Client
export { anthropic } from './client'

// Schemas
export {
  ExtractionResponseSchema,
  AnalysisResponseSchema,
  RecommendationResponseSchema,
  AnalysisResultSchema,
  ExtractionResultSchema,
  RecommendationSchema,
  type ExtractionResponse,
  type AnalysisResponse,
  type RecommendationResponse,
  type AnalysisResult,
  type ExtractionResult,
  type Recommendation,
} from './schemas'

// Prompts
export {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT,
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_USER_PROMPT,
} from './prompts'

// Functions
export { extractCompetitionFromUrl } from './extract'
export { analyzeSubmission } from './analyze'
export {
  getRecommendations,
  scoreCompetition,
} from './recommend'
