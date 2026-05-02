#!/bin/sh
set -e

echo "🚀 Running database migrations..."

# Wait for DB to be ready if needed (optional but recommended in CI/CD)
# npx wait-on $DATABASE_URL

npx prisma migrate deploy

echo "✅ Migrations completed successfully."
