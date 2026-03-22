#!/bin/sh
set -e

echo "🚀 Literaturkompass v2 starting..."

# Generate Prisma client with engine binaries (skipped during build)
echo "⚙️ Generating Prisma client..."
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Run data migration from v1 if data exists and not yet migrated
if [ -f "./data/data.json" ]; then
  echo "📚 Migrating v1 data..."
  node --experimental-specifier-resolution=node ./scripts/migrate-json.js ./data/data.json || true
fi

echo "✅ Starting Next.js server..."
exec node server.js
