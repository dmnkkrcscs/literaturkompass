# tRPC Quick Reference

## Client-Side Usage

### In React Components
```typescript
'use client'

import { trpc } from '@/lib/trpc'

export function MyComponent() {
  // Query example
  const { data, isLoading, error } = trpc.competition.list.useQuery({
    filters: { starred: true },
    pagination: { take: 10 },
  })

  // Mutation example
  const starMutation = trpc.competition.star.useMutation({
    onSuccess: (data) => {
      console.log('Starred:', data)
    },
  })

  const handleStar = (id: string) => {
    starMutation.mutate({ id })
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data?.competitions.map((comp) => (
        <div key={comp.id}>
          <h3>{comp.title}</h3>
          <button onClick={() => handleStar(comp.id)}>
            {comp.starred ? '★' : '☆'} Star
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Available Routers & Procedures

### competition
- `list` (query) - Get filtered/paginated competitions
- `byId` (query) - Get single competition
- `star` (mutation) - Toggle star status
- `dismiss` (mutation) - Mark dismissed
- `restore` (mutation) - Restore dismissed
- `addManual` (mutation) - Create new competition

### submission
- `list` (query) - Get submissions with filters
- `create` (mutation) - Create new submission
- `updateStatus` (mutation) - Change status
- `uploadDocument` (mutation) - Add document metadata

### source
- `list` (query) - Get all sources
- `add` (mutation) - Create new source
- `update` (mutation) - Modify source
- `delete` (mutation) - Soft delete source

### crawl
- `trigger` (mutation) - Start crawl job
- `logs` (query) - Get crawl logs
- `status` (query) - Get crawl status

### ai
- `scanUrl` (mutation) - Extract data from URL
- `analyzeText` (mutation) - Analyze text against competition
- `recommendations` (query) - Get recommended competitions

### stats
- `dashboard` (query) - Get overview statistics
- `submissions` (query) - Get submission analytics

## Common Patterns

### Paginated List with Filters
```typescript
const [filters, setFilters] = useState({ starred: true })
const [page, setPage] = useState(0)

const { data } = trpc.competition.list.useQuery({
  filters,
  pagination: { take: 20, skip: page * 20 },
})
```

### Mutation with Invalidation
```typescript
const utils = trpc.useUtils()

const starMutation = trpc.competition.star.useMutation({
  onSuccess: async () => {
    // Invalidate and refetch
    await utils.competition.list.invalidate()
  },
})
```

### Infinite Query / Pagination
```typescript
const { data, fetchNextPage, hasNextPage } = trpc.competition.list.useInfiniteQuery(
  { filters: {} },
  {
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return { skip: lastPage.pagination.skip + lastPage.pagination.take }
      }
    },
  }
)
```

### Error Handling
```typescript
const mutation = trpc.competition.addManual.useMutation({
  onError: (error) => {
    console.error('Error:', error.message)
    // Show toast notification, etc.
  },
})
```

## Server-Side Usage

### In Server Components or API Routes
```typescript
import { appRouter } from '@/server/trpc/router'

// Create caller
const caller = appRouter.createCaller({})

// Use like regular promises
const competitions = await caller.competition.list({
  filters: { starred: true },
})
```

### With Database Queries
All routers use `db` from `@/lib/db`:
```typescript
import { db } from '@/lib/db'

// Direct Prisma usage available in routers
const competition = await db.competition.findUnique({
  where: { id: 'comp-123' },
})
```

## Type Safety

### Input Types
```typescript
import { AppRouter } from '@/server/trpc/router'

type ListInput = Parameters<AppRouter['competition']['list']['_def']['inputs']>[0]

// Autocomplete for all inputs in IDE
```

### Response Types
```typescript
import { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/trpc/router'

type RouterOutputs = inferRouterOutputs<AppRouter>

type CompetitionListOutput = RouterOutputs['competition']['list']
```

## Configuration

### React Query Options
Edit `src/components/providers.tsx`:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})
```

### tRPC Client Options
Edit `src/lib/trpc.ts`:
```typescript
httpBatchLink({
  url: '/api/trpc',
  credentials: 'include', // Send cookies with requests
  headers: {
    // Add custom headers if needed
  },
})
```

## Debugging

### Console Logging
```typescript
// Enable query/mutation logging
const mutation = trpc.competition.star.useMutation({
  onMutate: (variables) => console.log('Mutating:', variables),
  onSuccess: (data) => console.log('Success:', data),
  onError: (error) => console.error('Error:', error),
})
```

### Network Tab
- All requests go to `/api/trpc`
- Check DevTools > Network tab
- Query batching groups multiple requests

### React Query DevTools
```bash
npm install @tanstack/react-query-devtools
```

```typescript
// In providers.tsx or app
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<ReactQueryDevtools initialIsOpen={false} />
```

## Testing

### Mock Example
```typescript
import { vi } from 'vitest'
import * as trpcModule from '@/lib/trpc'

vi.mock('@/lib/trpc', () => ({
  trpc: {
    competition: {
      list: {
        useQuery: vi.fn(() => ({
          data: { competitions: [], count: 0 },
          isLoading: false,
        })),
      },
    },
  },
}))
```

## Performance Tips

1. **Use Pagination**
   - Don't fetch all items at once
   - Use `take` and `skip` for large datasets

2. **Invalidate Smartly**
   - Invalidate only affected queries after mutations
   - Use `utils.competition.list.invalidate()` vs invalidating all

3. **Batch Requests**
   - tRPC automatically batches multiple queries
   - No need to use Promise.all

4. **Lazy Load**
   - Use `enabled: false` to delay queries
   - Useful for dependent queries

5. **Cache Management**
   - Adjust `staleTime` and `gcTime` based on data freshness needs
   - Longer times = fewer requests, staler data

## Common Issues

### "Cannot find module '@/lib/trpc'"
- Ensure `tsconfig.json` has correct path alias
- Rebuild TypeScript

### "useQuery called outside Provider"
- Wrap component tree with `<Providers>` in layout
- Check that `src/app/layout.tsx` imports Providers

### Type errors with input
- Ensure Zod schema matches expected type
- Check import paths for routers

### Mutations not updating UI
- Use `invalidate()` to refetch after mutation
- Or use optimistic updates with `onMutate`

## Next Steps

1. Test with existing data
2. Add authentication (extend publicProcedure)
3. Implement Claude API integration
4. Setup BullMQ for crawl operations
5. Add error handling middleware
6. Implement caching strategies
