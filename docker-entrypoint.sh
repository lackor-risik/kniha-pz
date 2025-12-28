#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Running database seed..."
node prisma/seed.js

echo "Starting application..."
exec node server.js
