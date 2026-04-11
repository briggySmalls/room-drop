#!/usr/bin/env bash
set -euo pipefail

# Load CRON_SECRET from .env.local
if [ -f .env.local ]; then
  CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "Error: CRON_SECRET not found in .env.local"
  exit 1
fi

response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/check-prices 2>&1) || {
  echo "Error: could not connect to http://localhost:3000 — is the dev server running? (npm run dev)"
  exit 1
}

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 400 ] 2>/dev/null; then
  echo "Error: HTTP $http_code"
  echo "$body"
  exit 1
fi

echo "$body" | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
