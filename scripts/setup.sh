#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; MISSING+=("$1"); }

MISSING=()

echo ""
echo "Checking prerequisites..."
echo ""

# Node.js (>= 20)
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 20 ]; then
    ok "Node.js $NODE_VERSION"
  else
    fail "Node.js $NODE_VERSION (need >= 20)"
  fi
else
  fail "Node.js not found"
fi

# npm
if command -v npm &>/dev/null; then
  ok "npm $(npm -v)"
else
  fail "npm not found"
fi

# Docker
if command -v docker &>/dev/null; then
  if docker info &>/dev/null; then
    ok "Docker (running)"
  else
    fail "Docker installed but not running — start Docker Desktop"
  fi
else
  fail "Docker not found (required for local Supabase)"
fi

# Supabase CLI
if command -v supabase &>/dev/null; then
  ok "Supabase CLI $(supabase --version 2>&1 | head -1)"
else
  fail "Supabase CLI not found — install: brew install supabase/tap/supabase"
fi

echo ""

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}Missing prerequisites. Fix the above issues and re-run.${NC}"
  exit 1
fi

echo -e "${GREEN}All prerequisites met.${NC}"
echo ""

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Copy env template if no .env.local exists
if [ ! -f .env.local ]; then
  warn "No .env.local found — copying from .env.example"
  cp .env.example .env.local
  echo "  Edit .env.local with your API keys (SerpAPI, Anthropic, Resend) before running the app."
fi

# Start local Supabase
echo ""
echo "Starting local Supabase..."
supabase start

# Apply migrations
echo ""
echo "Applying database migrations..."
supabase db push

# Inject Supabase keys into .env.local
echo ""
echo "Updating .env.local with local Supabase keys..."
eval "$(supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

update_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env.local; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" .env.local
  else
    echo "${key}=${value}" >> .env.local
  fi
}

update_env "NEXT_PUBLIC_SUPABASE_URL" "$API_URL"
update_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
update_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"
ok "Supabase keys written to .env.local"

echo ""
echo -e "${GREEN}Setup complete.${NC} Run 'npm run dev' to start the app."
