import { excludeMagazineRoots } from '@/server/lib/competition-filters'

export interface CompetitionFilterParams {
  search?: string
  type?: string
  hasDeadline?: boolean
  showSubmitted?: boolean
  today?: Date
}

/** Builds the Prisma WHERE clause for the competition list query. Exported for testing. */
export function buildCompetitionWhere(params: CompetitionFilterParams) {
  const today = params.today ?? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()

  const where: Record<string, unknown> & { AND: unknown[] } = {
    dismissed: false,
    status: 'ACTIVE',
    ...excludeMagazineRoots,
    AND: [
      {
        OR: [
          { deadline: { gte: today } },
          { deadline: null },
          { starred: true },
        ],
      },
    ],
  }

  if (!params.showSubmitted) {
    where.submissions = { none: { status: { in: ['SUBMITTED', 'ACCEPTED'] } } }
  }

  if (params.type && params.type !== 'ALL') {
    where.type = params.type
  }

  if (params.hasDeadline) {
    where.deadline = { not: null }
  }

  if (params.search) {
    where.AND.push({
      OR: [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { organizer: { contains: params.search, mode: 'insensitive' } },
      ],
    })
  }

  return where
}
