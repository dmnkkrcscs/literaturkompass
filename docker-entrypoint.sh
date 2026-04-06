#!/bin/sh

echo "Literaturkompass v2 starting..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "WARNING: Migration failed, continuing anyway..."

# Auto-import v1 data if not yet done
IMPORT_MARKER="/app/.v1-imported"
if [ ! -f "$IMPORT_MARKER" ] && [ -f "./data/extracted_data.json" ]; then
  echo "Importing v1 data..."
  npx tsx scripts/import-v1-data.ts && touch "$IMPORT_MARKER" || echo "WARNING: v1 import failed"
fi

echo "Starting Next.js server..."
exec node server.js
