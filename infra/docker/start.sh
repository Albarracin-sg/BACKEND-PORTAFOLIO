#!/bin/sh
set -e

echo "🚀 Starting portfolio backend container..."

echo "🧬 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔨 Generating Prisma client..."
npx prisma generate

echo "✅ Migrations and generation done. Starting Nest app..."
exec node dist/src/main.js
