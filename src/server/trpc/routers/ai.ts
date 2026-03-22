import { z } from 'zod'
import { db } from '@/lib/db'
import { publicProcedure, router } from '../init'

// Placeholder for Claude API integration
const callClaudeAPI = async (prompt: string): Promise<string> => {
  // TODO: Integrate with @anthropic-ai/sdk
  // const client = new Anthropic()
  // const message = await client.messages.create({
  //   model: 'claude-3-5-sonnet-20241022',
  //   max_tokens: 1024,
  //   messages: [{ role: 'user', content: prompt }],
  // })
  // return message.content[0].type === 'text' ? message.content[0].text : ''

  return 'Claude API integration pending'
}

export const aiRouter = router({
  scanUrl: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `Analyze the following URL and extract structured data about any literature competitions, writing contests, or similar opportunities:

URL: ${input.url}

Please extract:
1. Title
2. Description
3. Deadline
4. Prize information
5. Genre/category
6. Age requirements
7. Any other relevant details

Return the data in a structured format.`

      const result = await callClaudeAPI(prompt)

      return {
        url: input.url,
        extractedData: result,
        timestamp: new Date(),
      }
    }),

  analyzeText: publicProcedure
    .input(
      z.object({
        text: z.string(),
        competitionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const competition = await db.competition.findUnique({
        where: { id: input.competitionId },
        select: { title: true, description: true, requirements: true },
      })

      if (!competition) {
        throw new Error('Competition not found')
      }

      const prompt = `Analyze the following text against this writing competition to assess compatibility:

Competition: ${competition.title}
Requirements: ${competition.requirements || 'No specific requirements'}

Text to analyze:
${input.text.substring(0, 2000)}

Please provide:
1. Overall fit score (0-100)
2. Strengths relative to the competition
3. Areas that might need improvement
4. Specific suggestions

Be concise and constructive.`

      const analysis = await callClaudeAPI(prompt)

      // Store analysis in database
      const record = await db.analysis.create({
        data: {
          competitionId: input.competitionId,
          type: 'TEXT_ANALYSIS',
          result: analysis,
        },
      })

      return {
        analysisId: record.id,
        analysis,
        timestamp: new Date(),
      }
    }),

  recommendations: publicProcedure.query(async () => {
    // Get all competitions that aren't dismissed
    const competitions = await db.competition.findMany({
      where: {
        dismissed: false,
      },
      orderBy: {
        relevanceScore: 'desc',
      },
      take: 10,
      include: {
        genres: true,
      },
    })

    return {
      recommendations: competitions,
      timestamp: new Date(),
    }
  }),
})
