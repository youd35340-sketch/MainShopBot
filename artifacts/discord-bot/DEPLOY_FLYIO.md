# Deploy Your Discord Shop Bot to Fly.io (Free, 24/7)

Fly.io gives you a free VM that runs forever. Your bot connects **outward** to Discord
so you don't need any port, domain, or HTTP setup.

---

## What You Need Before Starting

| Tool | Install link |
|------|-------------|
| flyctl CLI | https://fly.io/docs/hands-on/install-flyctl/ |
| A free Fly.io account | https://fly.io/app/sign-up (no credit card needed) |
| Your two bot secrets | See bottom of this guide |

---

## Step 1 — Install flyctl

**Windows:**
```
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Mac:**
```
brew install flyctl
```

**Linux:**
```
curl -L https://fly.io/install.sh | sh
```

---

## Step 2 — Log In

```
flyctl auth login
```

This opens your browser. Sign in and come back to the terminal.

---

## Step 3 — Extract the Bot Files

Extract the downloaded `discord-bot-flyio.tar.gz` file.
You'll get a folder called `discord-bot`. Open a terminal **inside that folder**.

```
cd discord-bot
```

---

## Step 4 — Create the Fly App

```
flyctl launch --no-deploy
```

When it asks questions, answer like this:

| Question | Answer |
|----------|--------|
| App name | `vix-shop-bot` (or anything you want) |
| Region | Pick the one closest to you (e.g. `ord` = Chicago, `lax` = Los Angeles, `lhr` = London) |
| Set up PostgreSQL? | **No** |
| Set up Redis? | **No** |
| Deploy now? | **No** (we set secrets first) |

> If flyctl rewrites your `fly.toml`, that's fine — it just fills in your app name.

---

## Step 5 — Create the Persistent Volume (Saves Your Data)

This keeps your products, categories, and settings safe across redeploys.

```
flyctl volumes create shop_data --region ord --size 1
```

Replace `ord` with whatever region you chose above.

---

## Step 6 — Set Your Secrets

These replace the `.env` file. Run both commands:

```
flyctl secrets set DISCORD_TOKEN=paste-your-token-here
flyctl secrets set DISCORD_CLIENT_ID=paste-your-client-id-here
```

**Where to find these:**
- Go to https://discord.com/developers/applications
- Click your bot → **Bot** tab → **Reset Token** → copy it
- Click **General Information** → copy **Application ID** (that's the Client ID)

---

## Step 7 — Deploy

```
flyctl deploy
```

This builds your Docker image and launches the bot. Takes about 2–3 minutes the first time.

---

## Step 8 — Check It's Running

```
flyctl logs
```

You should see:
```
✅ Logged in as Vix's SMM (Website In BIO)#9589
📡 Registering 13 slash commands globally…
✅ Slash commands registered!
```

Your bot is now online 24/7 — even when you close your laptop.

---

## Managing Your Bot After Deployment

| Task | Command |
|------|---------|
| View live logs | `flyctl logs` |
| Redeploy after code changes | `flyctl deploy` |
| Update a secret | `flyctl secrets set DISCORD_TOKEN=new-token` |
| Stop the bot | `flyctl scale count 0` |
| Start the bot again | `flyctl scale count 1` |
| Open Fly.io dashboard | `flyctl dashboard` |

---

## Full Summary of What Fly.io Needs

| Setting | Value |
|---------|-------|
| **Port** | ❌ None needed — Discord bots connect outward |
| **HTTP service** | ❌ None needed |
| **Health check URL** | ❌ None — Fly monitors the process directly |
| **Region** | Your choice (see list below) |
| **VM size** | `shared-cpu-1x` (free tier) |
| **RAM** | `256mb` (free tier) |
| **Volume name** | `shop_data` mounted at `/app/data` |
| **Secret 1** | `DISCORD_TOKEN` |
| **Secret 2** | `DISCORD_CLIENT_ID` |

### Closest Fly.io Regions

| Code | Location |
|------|----------|
| `ord` | Chicago, USA |
| `lax` | Los Angeles, USA |
| `iad` | Ashburn, Virginia, USA |
| `lhr` | London, UK |
| `cdg` | Paris, France |
| `sin` | Singapore |
| `syd` | Sydney, Australia |

---

## Free Tier Limits

Fly.io free tier includes:
- ✅ **3 shared VMs** (you only need 1)
- ✅ **3GB persistent storage** (you'll use ~1MB)
- ✅ **160GB outbound transfer/month**
- ✅ No credit card required to start

Your bot will use well under all these limits.

---

## If the Bot Crashes / Doesn't Start

1. Run `flyctl logs` to see the error
2. Most common cause: wrong token — re-run `flyctl secrets set DISCORD_TOKEN=your-correct-token`
3. Then `flyctl deploy` to redeploy

---

## Updating the Bot Later

1. Make your changes to the files
2. Run `flyctl deploy` from inside the `discord-bot` folder
3. Fly rebuilds and restarts automatically in ~2 minutes
