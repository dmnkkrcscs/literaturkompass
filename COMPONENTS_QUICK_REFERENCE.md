# Literaturkompass v2 - Components Quick Reference

## File Locations

All components are located in `/src/components/` organized by category:

```
src/components/
├── ui/                    # Base UI components
├── layout/                # Page layout components
├── competition/           # Competition-specific components
└── providers.tsx          # Updated with ToastProvider
```

## Component Quick Start

### Navbar
```tsx
import { Navbar } from '@/components/layout'

// Add to root layout
<Navbar />
```

### Stats Bar
```tsx
import { StatsBar } from '@/components/layout'

<StatsBar
  total={45}
  wettbewerbe={15}
  anthologien={10}
  zeitschriften={20}
  offeneFristen={8}
  geplant={12}
/>
```

### Competition Card
```tsx
import { CompetitionCard } from '@/components/competition'

<CompetitionCard
  id="comp-1"
  type="WETTBEWERB"
  name="Literary Prize 2026"
  organizer="Publishing House"
  deadline={new Date('2026-12-31')}
  theme="Future Visions"
  genres={['Novel', 'Short Story']}
  prize="€5000"
  maxLength="80000 words"
  url="https://example.com"
  onStar={(id, starred) => handleStar(id, starred)}
  onDismiss={(id) => handleDismiss(id)}
/>
```

### Competition List
```tsx
import { CompetitionList } from '@/components/competition'

<CompetitionList
  competitions={competitionArray}
  loading={isLoading}
  emptyMessage="No competitions found"
  onStar={handleStar}
  onDismiss={handleDismiss}
/>
```

### Search Filters
```tsx
import { SearchFilters } from '@/components/competition'

<SearchFilters
  onFilterChange={(filters) => {
    // filters includes: search, type, genres, deadlineRange, starredOnly, sortBy
    console.log(filters)
  }}
  availableGenres={['Novel', 'Short Story', 'Poetry']}
/>
```

### Button
```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md">Click me</Button>
<Button variant="secondary" loading>Loading...</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">Cancel</Button>
```

### Badge
```tsx
import { Badge } from '@/components/ui'

<Badge variant="wine">Wettbewerb</Badge>
<Badge variant="sage">Anthologie</Badge>
<Badge variant="gold">Zeitschrift</Badge>
<Badge variant="accent">Featured</Badge>
<Badge variant="default">Tag</Badge>
```

### Card
```tsx
import { Card } from '@/components/ui'

<Card
  header={<h2>Title</h2>}
  borderLeftColor="wine"
  padding="md"
>
  Content here
</Card>
```

### Toast Notifications
```tsx
import { useToast } from '@/components/ui'

function MyComponent() {
  const { addToast } = useToast()

  return (
    <button onClick={() => {
      addToast('Success!', 'success')
      addToast('Error!', 'error')
      addToast('Info', 'info', 5000) // 5 second duration
    }}>
      Show Toast
    </button>
  )
}
```

## Styling

### Color Variants

**Badge/Button variants:**
- `default` - Gray/neutral
- `primary` - Orange (accent)
- `secondary` - Light surface
- `ghost` - Transparent
- `danger` - Red
- `wine` - Contest color (#e57373)
- `sage` - Anthology color (#81c784)
- `gold` - Journal color (#ffd54f)
- `accent` - Primary accent

### Dark Mode

All components automatically support dark mode. The theme toggle is in the Navbar.

### Responsive Design

All components are mobile-first and responsive:
- Navbar has mobile hamburger menu
- Cards stack vertically on mobile
- Filters collapse on mobile
- Text scales appropriately

## Data Types

### Competition Type
```typescript
type CompetitionType = 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'
```

### Filter State
```typescript
interface SearchFiltersState {
  search: string
  type?: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT' | 'all'
  genres: string[]
  deadlineRange?: 'all' | '7days' | '30days' | '90days'
  starredOnly?: boolean
  sortBy?: 'newest' | 'deadline' | 'relevance'
}
```

## Integration with App Layout

```tsx
// src/app/layout.tsx
import { Navbar } from '@/components/layout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
```

## Example Page

```tsx
'use client'

import { useState } from 'react'
import { StatsBar } from '@/components/layout'
import { CompetitionList, SearchFilters, SearchFiltersState } from '@/components/competition'
import { useToast } from '@/components/ui'

export default function DiscoverPage() {
  const [competitions, setCompetitions] = useState([])
  const [filters, setFilters] = useState<SearchFiltersState>({
    search: '',
    type: 'all',
    genres: [],
  })
  const { addToast } = useToast()

  const handleStar = (id: string, starred: boolean) => {
    addToast(
      starred ? 'Added to favorites' : 'Removed from favorites',
      'success'
    )
  }

  const handleDismiss = (id: string) => {
    addToast('Competition dismissed', 'info')
  }

  return (
    <>
      <StatsBar
        total={45}
        wettbewerbe={15}
        anthologien={10}
        zeitschriften={20}
        offeneFristen={8}
        geplant={12}
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SearchFilters
          onFilterChange={setFilters}
          availableGenres={['Novel', 'Short Story', 'Poetry']}
        />
        <CompetitionList
          competitions={competitions}
          onStar={handleStar}
          onDismiss={handleDismiss}
        />
      </div>
    </>
  )
}
```

## Available Icons

From lucide-react (pre-integrated):
- Home, Search, Star, Trophy, Globe, BarChart3
- Sun, Moon (for theme toggle)
- Menu, X (for mobile menu)
- CheckCircle, AlertCircle, Info (for toasts)
- Calendar, ExternalLink (for competitions)

## Notes

- Components are pre-configured with the project's color scheme
- No additional dependencies needed - uses existing project setup
- All TypeScript types are exported for external use
- Toast system is integrated into global providers
- Dark mode is automatic based on user preference
- Responsive design works on all screen sizes
