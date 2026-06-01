#!/bin/bash
# ============================================================
#  Vix's Shop Bot — Fly.io Deploy Script
#  Run this from the Replit Shell:
#    cd artifacts/discord-bot && bash fly-deploy.sh
# ============================================================

export FLYCTL_INSTALL="/home/runner/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Vix Shop Bot — Fly.io Deployer${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ── Step 1: Check flyctl ─────────────────────────────────────
if ! command -v flyctl &> /dev/null; then
  echo -e "${YELLOW}Installing flyctl...${NC}"
  curl -L https://fly.io/install.sh | sh
  export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}✓ flyctl ready${NC}"

# ── Step 2: Login ────────────────────────────────────────────
echo ""
echo -e "${CYAN}Step 1/5 — Log in to Fly.io${NC}"
echo -e "A link will appear. ${YELLOW}Copy it and open it in your browser.${NC}"
echo ""
flyctl auth login

# ── Step 3: Create the app ───────────────────────────────────
echo ""
echo -e "${CYAN}Step 2/5 — Create your Fly.io app${NC}"
echo -e "${YELLOW}When asked:${NC}"
echo "  • App name  → press Enter to accept default, or type your own"
echo "  • Region    → pick the closest (ord=Chicago, lax=LA, lhr=London)"
echo "  • Postgres? → No"
echo "  • Redis?    → No"
echo "  • Deploy?   → No"
echo ""
flyctl launch --no-deploy

# ── Step 4: Create persistent volume ────────────────────────
echo ""
echo -e "${CYAN}Step 3/5 — Create data volume (saves your products forever)${NC}"

REGION=$(flyctl config show 2>/dev/null | grep primary_region | awk '{print $2}' || echo "ord")
echo -e "Creating 1GB volume in region ${YELLOW}${REGION}${NC}..."
flyctl volumes create shop_data --region "$REGION" --size 1

# ── Step 5: Set secrets ──────────────────────────────────────
echo ""
echo -e "${CYAN}Step 4/5 — Set your bot secrets${NC}"
echo ""
echo -e "${YELLOW}Where to find these:${NC}"
echo "  DISCORD_TOKEN    → discord.com/developers/applications → your bot → Bot tab → Reset Token"
echo "  DISCORD_CLIENT_ID → same page → General Information → Application ID"
echo ""
read -p "Paste your DISCORD_TOKEN: " TOKEN
read -p "Paste your DISCORD_CLIENT_ID: " CLIENT_ID

flyctl secrets set DISCORD_TOKEN="$TOKEN" DISCORD_CLIENT_ID="$CLIENT_ID"

# ── Step 6: Deploy ───────────────────────────────────────────
echo ""
echo -e "${CYAN}Step 5/5 — Deploying (takes ~2 minutes)...${NC}"
echo ""
flyctl deploy

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Your bot is now live on Fly.io 24/7!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Useful commands:"
echo "  flyctl logs          → see live bot logs"
echo "  flyctl deploy        → redeploy after any changes"
echo "  flyctl scale count 0 → stop the bot"
echo "  flyctl scale count 1 → start the bot again"
echo ""
flyctl logs --tail
