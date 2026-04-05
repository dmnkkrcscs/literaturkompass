#!/bin/sh

echo "Literaturkompass v2 starting..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "WARNING: Migration failed, continuing anyway..."

echo "Starting Next.js server..."
exec node server.js
