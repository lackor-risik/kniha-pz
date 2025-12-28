#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Running database seed..."
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts

echo "Starting application..."
exec node server.js
