#!/bin/sh

echo "Literaturkompass v2 starting..."

echo "Running database migrations..."
npx prisma migrate deploy || {
  echo "ERROR: Migration failed, aborting startup."
  exit 1
}

echo "Starting Next.js server..."
exec node server.js
