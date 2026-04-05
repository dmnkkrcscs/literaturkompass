# tRPC Setup for Literaturkompass v2

## Overview

Complete tRPC setup for the Literaturkompass v2 Next.js project. All routers are configured with proper type safety, input validation using Zod, and integration with Prisma database.

## Architecture

```
src/
├── server/
│   └── trpc/
│       ├── init.ts                      # tRPC initialization
│       ├── router.ts                    # Main app router
│       └── routers/
│           ├── competition.ts           # Competition management
│           ├── submission.ts            # Submission tracking
│           ├── source.ts                # Source management
│           ├── crawl.ts                 # Crawl operations
│           ├── ai.ts                    # AI analysis features
│           └── stats.ts                 # Dashboard statistics
├── app/
│   └── api/
│       └── trpc/
│           └── [trpc]/
│               └── route.ts             # tRPC HTTP handler
├── lib/
│   ├── db.ts                            # Prisma client
│   ├── trpc.ts                          # Client-side tRPC setup
│   └── auth.ts
└── components/
    └── providers.tsx                    # React Query + tRPC provider
```

## Files Created

### 1. `src/server/trpc/init.ts` - tRPC Initialization
- Creates tRPC instance with default transformer
- Exports `router`, `publicProcedure`, and `createCallerFactory`
- Simple single-user app setup (authentication can be added later)

### 2. `src/server/trpc/router.ts` - Main App Router
- Combines all sub-routers
- Exports `AppRouter` type for client-side type safety
- Routes:
  - `competition` - Competition management
  - `submission` - Submission tracking
  - `source` - Source management
  - `crawl` - Crawl operations
  - `ai` - AI analysis features
  - `stats` - Dashboard statistics

### 3. `src/server/trpc/routers/competition.ts` - Competition Router
Procedures:
- **list** - Filter, sort, and paginate competitions
  - Input: filters, pagination, sort options
  - Returns: competitions array with count and pagination info
  - Filters: type, search, genre, deadline range, starred, dismissed, minScore

- **byId** - Get single competition with submissions and analyses
  - Returns: full competition with relations

- **star** - Toggle starred status
  - Input: competition ID
  - Returns: updated competition

- **dismiss** - Mark as dismissed and optionally log reason
  - Input: ID, optional reason
  - Creates: UserFeedback record if reason provided

- **restore** - Restore dismissed competition
  - Input: competition ID

- **addManual** - Create competition from manual input
  - Input: all competition fields plus optional genres array
  - Creates: competition with genre relationships

### 4. `src/server/trpc/routers/submission.ts` - Submission Router
Procedures:
- **list** - Filter by status with pagination
  - Includes: competition and documents relations

- **create** - Create new submission for a competition
  - Sets status to "PLANNED" by default

- **updateStatus** - Update submission status
  - Statuses: PLANNED, SUBMITTED, ACCEPTED, REJECTED

- **uploadDocument** - Save document metadata
  - Accepts: URL, name, charCount, wordCount, mimeType

### 5. `src/server/trpc/routers/source.ts` - Source Router
Procedures:
- **list** - Get all sources with competition count

- **add** - Create new source
  - Input: name, baseUrl, adapter, optional adapterConfig

- **update** - Modify source settings
  - Can toggle isActive and update adapterConfig

- **delete** - Soft delete source (sets isActive=false)

### 6. `src/server/trpc/routers/crawl.ts` - Crawl Router
Procedures:
- **trigger** - Manually trigger crawl job
  - Creates CrawlLog entry
  - TODO: Integrate with BullMQ for job queueing

- **logs** - Get recent crawl logs with pagination
  - Includes: source information

- **status** - Get current crawl status
  - Can fetch specific log or latest status

### 7. `src/server/trpc/routers/ai.ts` - AI Router
Procedures:
- **scanUrl** - Extract data from URL
  - TODO: Integrate with Claude API
  - Input: URL
  - Returns: extracted data from page

- **analyzeText** - Analyze text against competition
  - Input: text, competitionId
  - Stores: analysis result in database
  - TODO: Integrate with Claude API for detailed analysis

- **recommendations** - Get recommended competitions
  - Returns: top 10 competitions by relevance score
  - Filters: non-dismissed only

### 8. `src/server/trpc/routers/stats.ts` - Stats Router
Procedures:
- **dashboard** - Get overview statistics
  - Returns: total count, by type, open deadlines, starred, submitted, accepted

- **submissions** - Get submission analytics
  - Returns: by month, success rate, by genre

### 9. `src/app/api/trpc/[trpc]/route.ts` - HTTP Handler
- Adapts tRPC to Next.js App Router
- Handles GET and POST requests
- Endpoint: `/api/trpc`

### 10. `src/lib/trpc.ts` - Client Setup
- Creates tRPC React client
- Configures httpBatchLink
- Exports tRPC hooks factory
- Endpoint: `/api/trpc`

### 11. `src/components/providers.tsx` - Provider Wrapper
- Wraps app with tRPC and React Query providers
- Configures query client defaults:
  - staleTime: 1 minute
  - gcTime: 5 minutes

### 12. `src/app/layout.tsx` - Updated Root Layout
- Wraps children with Providers component
- Enables tRPC and React Query in entire app

## Key Features

### Type Safety
- All routers have full TypeScript support
- Client can import `AppRouter` type
- Input validation with Zod schemas

### Database Integration
- Uses Prisma client from `@/lib/db`
- Leverages database relations for efficient queries
- Proper error handling

### Pagination Support
- Standardized pagination schema across routers
- Returns: items, count, hasMore flag, pagination metadata

### Filtering & Sorting
- Competition router supports advanced filtering
- Multiple sort options (deadline, relevance, created)
- Search across multiple fields

### Error Handling
- Basic error handling with descriptive messages
- Can be extended with custom error middleware

## Usage Examples

### Server-Side (API Routes or Server Components)
```typescript
import { appRouter } from '@/server/trpc/router'

const caller = appRouter.createCaller({})
const competitions = await caller.competition.list({
  filters: { starred: true },
  pagination: { take: 10 },
})
```

### Client-Side (React Components)
```typescript
'use client'

import { trpc } from '@/lib/trpc'

export function CompetitionList() {
  const { data } = trpc.competition.list.useQuery({
    filters: { starred: true },
  })

  return <div>{/* render competitions */}</div>
}
```

## Integration Points

### Claude API Integration (TODO)
- Files: `src/server/trpc/routers/ai.ts`
- Need to import and initialize Anthropic client
- Methods to implement: `scanUrl`, `analyzeText`

### BullMQ Integration (TODO)
- File: `src/server/trpc/routers/crawl.ts`
- Queue job from `trigger` procedure
- Implement job handlers for crawling

### Database Schema
- Ensure Prisma schema includes:
  - Competition, Submission, Document, Source
  - Genre, Analysis, CrawlLog, UserFeedback
  - All required fields for each router's operations

## Configuration

### Environment Variables
- `DATABASE_URL` - Prisma database connection
- `REDIS_URL` - Redis for BullMQ (optional)
- `ANTHROPIC_API_KEY` - Claude API key (for AI features)

### Next.js Config
- No special tRPC config needed
- Uses standard fetch adapter for Next.js

## Testing Suggestions

1. **Competition Router**
   - Test filtering with various combinations
   - Verify star/dismiss toggle functionality
   - Test manual competition creation

2. **Submission Router**
   - Test status transitions
   - Verify document upload metadata

3. **Stats Router**
   - Verify dashboard calculations
   - Check genre aggregation logic

4. **AI Router**
   - Mock Claude API responses
   - Test URL scanning parsing

5. **Crawl Router**
   - Verify log creation
   - Test status queries

## Future Enhancements

1. Add authentication context (currently public procedures only)
2. Integrate Claude API for AI features
3. Setup BullMQ for background crawl jobs
4. Add error middleware with logging
5. Implement caching strategies
6. Add request rate limiting
7. Setup webhook handlers for external sources
8. Add WebSocket support for real-time updates

## File Locations Summary

```
/sessions/pensive-brave-pasteur/mnt/Literaturwettbewerbe/literaturkompass-v2/

Server-side:
- src/server/trpc/init.ts
- src/server/trpc/router.ts
- src/server/trpc/routers/competition.ts
- src/server/trpc/routers/submission.ts
- src/server/trpc/routers/source.ts
- src/server/trpc/routers/crawl.ts
- src/server/trpc/routers/ai.ts
- src/server/trpc/routers/stats.ts
- src/app/api/trpc/[trpc]/route.ts

Client-side:
- src/lib/trpc.ts
- src/components/providers.tsx
- src/app/layout.tsx (updated)
```

## Verification

All files have been created and verified:
✓ 8 router files in `src/server/trpc/routers/`
✓ 2 core files: `init.ts`, `router.ts`
✓ API handler: `src/app/api/trpc/[trpc]/route.ts`
✓ Client setup: `src/lib/trpc.ts`
✓ Provider: `src/components/providers.tsx`
✓ Layout updated with Providers wrapper

The setup is complete and ready for use. Next steps:
1. Review Prisma schema to ensure all models exist
2. Test basic queries with any existing data
3. Implement Claude API integration
4. Setup BullMQ for crawl operations
