#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}▸ $1${NC}"; }

# ── Prerequisites ─────────────────────────────────────────────

step "Checking prerequisites"

command -v supabase &>/dev/null || fail "Supabase CLI not found — brew install supabase/tap/supabase"
ok "Supabase CLI"

command -v vercel &>/dev/null || fail "Vercel CLI not found — npm i -g vercel"
ok "Vercel CLI"

# ── Supabase ──────────────────────────────────────────────────

step "Supabase: linking and pushing migrations"

if [ ! -f supabase/.temp/project-ref ]; then
  read -rp "  Supabase project ref (from dashboard URL): " PROJECT_REF
  supabase link --project-ref "$PROJECT_REF"
else
  ok "Already linked"
fi

supabase db push
ok "Migrations applied"

# ── Vercel ────────────────────────────────────────────────────

step "Vercel: linking project"

if [ ! -d .vercel ]; then
  vercel link
else
  ok "Already linked"
fi

# ── Environment variables ─────────────────────────────────────

step "Setting Vercel production environment variables"

# Read local env file for reusable API keys
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

push_var() {
  local name=$1
  local value=$2
  printf '%s' "$value" | vercel env add "$name" production --force 2>/dev/null \
    && ok "$name" \
    || warn "$name (already exists — update via 'vercel env rm $name production' then re-run)"
}

prompt_var() {
  local name=$1
  local current="${!name:-}"
  if [ -n "$current" ]; then
    echo -e "  ${name}=${current}"
    read -rp "  Press Enter to use this value, or type a new one: " input
    [ -n "$input" ] && current="$input"
  else
    read -rp "  ${name}: " current
    [ -z "$current" ] && fail "$name is required"
  fi
  push_var "$name" "$current"
}

# Supabase keys — always prompt since .env.local has localhost values
echo ""
echo "  Enter your production Supabase keys (from dashboard → Settings → API):"
echo ""

for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  # Clear localhost defaults so we don't accidentally push them
  if [[ "${!var:-}" == *"127.0.0.1"* ]] || [[ "${!var:-}" == *"localhost"* ]]; then
    unset "$var" 2>/dev/null || true
  fi
  prompt_var "$var"
done

# External API keys — reuse from .env.local
echo ""
echo "  External API keys (reading defaults from .env.local):"
echo ""

for var in SERPAPI_KEY ANTHROPIC_API_KEY RESEND_API_KEY RESEND_FROM_EMAIL; do
  prompt_var "$var"
done

# CRON_SECRET — generate if not set
CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"
push_var "CRON_SECRET" "$CRON_SECRET"

# ── Deploy ────────────────────────────────────────────────────

step "Deploying to Vercel"

vercel deploy --prod
DEPLOY_URL=$(vercel inspect --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

# ── Manual steps ──────────────────────────────────────────────

echo ""
echo -e "${GREEN}Deployment complete.${NC}"
echo ""
echo -e "${YELLOW}Remaining manual steps:${NC}"
echo ""
echo "  1. Google Cloud Console → APIs & Services → Credentials"
echo "     • Create OAuth 2.0 Client ID (Web application)"
echo "     • Add authorized redirect URI:"
echo "       https://<project-ref>.supabase.co/auth/v1/callback"
echo ""
echo "  2. Supabase Dashboard → Authentication → Providers → Google"
echo "     • Enable the provider"
echo "     • Paste Client ID and Client Secret from step 1"
echo ""
echo "  3. Supabase Dashboard → Authentication → URL Configuration"
if [ -n "${DEPLOY_URL:-}" ]; then
  echo "     • Site URL: https://${DEPLOY_URL}"
  echo "     • Redirect URLs: https://${DEPLOY_URL}/auth/callback"
else
  echo "     • Site URL: https://<your-vercel-domain>"
  echo "     • Redirect URLs: https://<your-vercel-domain>/auth/callback"
fi
echo ""
