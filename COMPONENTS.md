# Literaturkompass v2 - Shared UI Components

This document describes all the shared UI components created for the Literaturkompass v2 project.

## Component Structure

```
src/components/
├── ui/                          # Base UI components
│   ├── Badge.tsx               # Tag/badge component
│   ├── Button.tsx              # Reusable button with variants
│   ├── Card.tsx                # Card container with optional header
│   ├── Toast.tsx               # Toast notification system
│   └── index.ts                # Barrel export
├── layout/                      # Layout components
│   ├── Navbar.tsx              # Top navigation bar
│   ├── StatsBar.tsx            # Statistics bar
│   └── index.ts                # Barrel export
├── competition/                 # Competition-related components
│   ├── CompetitionCard.tsx     # Single competition card
│   ├── CompetitionList.tsx     # List of competition cards
│   ├── SearchFilters.tsx       # Search and filter component
│   └── index.ts                # Barrel export
└── providers.tsx               # TRPC, Query, Toast providers
```

## UI Components

### Badge

Displays small tag/badge elements with variant styling.

**Props:**
- `variant?: 'default' | 'wine' | 'sage' | 'gold' | 'accent'` - Color variant
- `children: React.ReactNode` - Badge content
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { Badge } from '@/components/ui'

<Badge variant="wine">Wettbewerb</Badge>
<Badge variant="sage">Anthologie</Badge>
<Badge variant="gold">Zeitschrift</Badge>
```

### Button

Reusable button component with multiple variants and sizes.

**Props:**
- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` - Button style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `loading?: boolean` - Show loading spinner
- `disabled?: boolean` - Disable button
- `children: React.ReactNode` - Button content

**Usage:**
```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md">Click me</Button>
<Button variant="secondary" loading>Loading...</Button>
<Button variant="danger" size="lg">Delete</Button>
```

### Card

Card container for displaying content with optional header and left border color.

**Props:**
- `children: React.ReactNode` - Card content
- `header?: React.ReactNode` - Optional header section
- `borderLeftColor?: 'wine' | 'sage' | 'gold' | 'none'` - Left border color
- `padding?: 'sm' | 'md' | 'lg'` - Padding size
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { Card } from '@/components/ui'

<Card borderLeftColor="wine" header={<h3>Title</h3>}>
  Card content here
</Card>
```

### Toast

Toast notification system with context-based management.

**Features:**
- Auto-dismiss after 3 seconds (configurable)
- Three types: success, error, info
- Positioned bottom-right
- Automatic cleanup

**Provider Setup:**
```tsx
// Already included in src/components/providers.tsx
import { ToastProvider } from '@/components/ui'

<ToastProvider>{children}</ToastProvider>
```

**Usage:**
```tsx
import { useToast } from '@/components/ui'

function MyComponent() {
  const { addToast } = useToast()

  const handleClick = () => {
    addToast('Success!', 'success')
    addToast('Error occurred', 'error', 5000) // 5 second duration
  }
}
```

## Layout Components

### Navbar

Horizontal navigation bar at the top with theme toggle and mobile menu.

**Features:**
- Logo linking to home (/)
- Navigation links: Dashboard, Entdecken, Geplant, Hall of Fame, Quellen, Statistiken
- Dark/light theme toggle
- Mobile hamburger menu
- Active route highlighting
- Responsive design

**Usage:**
```tsx
import { Navbar } from '@/components/layout'

// Add to your main layout
<Navbar />
```

**Navigation Links:**
| Label | Href | Icon |
|-------|------|------|
| Dashboard | / | Home |
| Entdecken | /entdecken | Search |
| Geplant | /geplant | Globe |
| Hall of Fame | /hall-of-fame | Trophy |
| Quellen | /quellen | Globe |
| Statistiken | /statistiken | BarChart3 |

### StatsBar

Horizontal stats bar displaying key metrics below the navbar.

**Props:**
- `total: number` - Total competitions
- `wettbewerbe: number` - Total contests
- `anthologien: number` - Total anthologies
- `zeitschriften: number` - Total journals
- `offeneFristen: number` - Open deadlines
- `geplant: number` - Planned submissions

**Usage:**
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

## Competition Components

### CompetitionCard

Card component displaying a single competition with actions.

**Props:**
- `id: string` - Unique competition ID
- `type: 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT'` - Competition type
- `name: string` - Competition name
- `organizer?: string | null` - Organizing entity
- `deadline?: Date | null` - Submission deadline
- `theme?: string | null` - Competition theme
- `genres: string[]` - Allowed genres
- `prize?: string | null` - Prize description
- `maxLength?: string | null` - Maximum submission length
- `url: string` - Link to competition details
- `starred?: boolean` - Is starred by user
- `relevanceScore?: number | null` - AI relevance score (0-1)
- `onStar?: (id: string, starred: boolean) => void` - Star action callback
- `onDismiss?: (id: string) => void` - Dismiss action callback

**Features:**
- Left border colored by type (wine, sage, gold)
- Days remaining indicator
- Genre tags
- Prize and max length info
- Star/dismiss/link buttons
- Relevance score badge

**Usage:**
```tsx
import { CompetitionCard } from '@/components/competition'

<CompetitionCard
  id="comp-1"
  type="WETTBEWERB"
  name="Deutsche Literaturpreis"
  organizer="Literaturkompass"
  deadline={new Date('2026-12-31')}
  theme="Zukunftsvisionen"
  genres={['Roman', 'Kurzgeschichte']}
  prize="€5000"
  maxLength="80000 Wörter"
  url="https://example.com"
  starred={false}
  onStar={(id, starred) => console.log(id, starred)}
  onDismiss={(id) => console.log(id)}
/>
```

### CompetitionList

List component for displaying multiple competitions with loading and empty states.

**Props:**
- `competitions: CompetitionCardProps[]` - Array of competitions
- `loading?: boolean` - Show loading skeleton
- `emptyMessage?: string` - Message when no results
- `onStar?: (id: string, starred: boolean) => void` - Star callback
- `onDismiss?: (id: string) => void` - Dismiss callback

**Usage:**
```tsx
import { CompetitionList } from '@/components/competition'

<CompetitionList
  competitions={competitionData}
  loading={isLoading}
  emptyMessage="Keine Wettbewerbe gefunden"
  onStar={handleStar}
  onDismiss={handleDismiss}
/>
```

### SearchFilters

Search and filter component with collapsible advanced options.

**Props:**
- `onFilterChange?: (filters: SearchFiltersState) => void` - Callback when filters change
- `availableGenres?: string[]` - List of selectable genres

**Filter State:**
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

**Usage:**
```tsx
import { SearchFilters } from '@/components/competition'

const [filters, setFilters] = useState<SearchFiltersState>({
  search: '',
  type: 'all',
  genres: [],
  deadlineRange: 'all',
  starredOnly: false,
  sortBy: 'deadline',
})

<SearchFilters
  onFilterChange={setFilters}
  availableGenres={['Roman', 'Kurzgeschichte', 'Lyrik']}
/>
```

## Styling & Theme

All components support dark mode through Tailwind CSS with the `dark:` prefix.

### Color Scheme

**Dark Mode:**
- Background: `#0a0a0f`
- Surface: `#151520`
- Accent: `#ffab40`
- Text: `#e8e8ed`

**Light Mode:**
- Background: `#f5f5f7`
- Surface: `#ffffff`
- Accent: `#e65100`
- Text: `#1a1a2e`

**Semantic Colors:**
- Wine (Contests): `#e57373`
- Sage (Anthologies): `#81c784`
- Gold (Journals): `#ffd54f`

## Tailwind Config

The project includes extended Tailwind configuration in `tailwind.config.ts`:

```typescript
colors: {
  dark: {
    bg: "#0a0a0f",
    surface: "#151520",
  },
  light: {
    bg: "#f5f5f7",
    surface: "#ffffff",
  },
  accent: {
    dark: "#ffab40",
    light: "#e65100",
  },
  wine: { DEFAULT: "#e57373" },
  sage: { DEFAULT: "#81c784" },
  gold: { DEFAULT: "#ffd54f" },
}
```

## Integration with App

### Update Root Layout

Include the Navbar in your app layout:

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
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### Example Page

```tsx
'use client'

import { useState } from 'react'
import { StatsBar } from '@/components/layout'
import { CompetitionList, SearchFilters } from '@/components/competition'
import { useToast } from '@/components/ui'

export default function DashboardPage() {
  const [competitions, setCompetitions] = useState([])
  const { addToast } = useToast()

  const handleStar = (id: string, starred: boolean) => {
    addToast('Competition marked', 'success')
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SearchFilters />
        <CompetitionList
          competitions={competitions}
          onStar={handleStar}
        />
      </div>
    </>
  )
}
```

## Dependencies

- `react` - UI library
- `next` - React framework
- `next-themes` - Theme management
- `lucide-react` - Icon library
- `tailwindcss` - Utility CSS framework
- `@tanstack/react-query` - Data fetching (already in project)

## Notes

- All components use TypeScript for type safety
- Components are 'use client' where state management is needed
- Dark mode support is built-in using Tailwind's dark mode
- Icons from lucide-react are used throughout
- Toast provider is already integrated into the global providers
