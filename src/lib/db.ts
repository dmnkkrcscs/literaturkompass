import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Append pool/timeout params to DATABASE_URL if not already present
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  if (url.includes('pool_timeout') || url.includes('connection_limit')) return url
  const separator = url.includes('?') ? '&' : '?'
  // connection_limit=15: enough for concurrent requests without exhausting DB
  // pool_timeout=10: fail fast if no connection available
  // statement_timeout=20000: kill any query running longer than 20s
  return `${url}${separator}connection_limit=15&pool_timeout=10&statement_timeout=20000`
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasourceUrl: getDatasourceUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
