# Deploy Your Discord Shop Bot to Railway (Free)

Follow every step in order and your bot will be online 24/7 for free.

---

## What You Need
- A free [GitHub](https://github.com) account
- A free [Railway](https://railway.app) account
- Your two bot secrets:
  - `DISCORD_TOKEN`
  - `DISCORD_CLIENT_ID`

---

## Step 1 — Create a GitHub Repository

1. Go to https://github.com and sign in (or sign up free)
2. Click the **+** in the top-right corner → **New repository**
3. Name it anything, e.g. `vix-shop-bot`
4. Set it to **Private** (keeps your bot code safe)
5. Do NOT tick "Add a README" — leave it empty
6. Click **Create repository**

---

## Step 2 — Upload Your Bot Files to GitHub

1. On your new repo page, click **uploading an existing file**
2. Open the folder you downloaded (`discord-bot`)
3. Select **all files inside it** — everything including:
   - `src/` folder
   - `data/` folder
   - `Dockerfile`
   - `railway.toml`
   - `package.json`
   - `tsconfig.json`
   - `.gitignore`
   - `DEPLOY.md`
4. Drag them all into the GitHub upload page
5. Scroll down → click **Commit changes**

---

## Step 3 — Deploy on Railway

1. Go to https://railway.app and sign in with your GitHub account
2. Click **New Project**
3. Click **Deploy from GitHub repo**
4. Select your `vix-shop-bot` repository
5. Railway will detect the `Dockerfile` automatically — click **Deploy Now**

---

## Step 4 — Add Your Bot Secrets

This is the most important step. Without these, the bot won't start.

1. In your Railway project, click on the service box (it will be building)
2. Click the **Variables** tab
3. Click **New Variable** and add these two:

| Name | Value |
|------|-------|
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Your bot's Application ID |

4. Railway will automatically redeploy after you add variables

---

## Step 5 — Check It's Running

1. Click the **Deployments** tab in Railway
2. Click the latest deployment → click **View Logs**
3. You should see:
   ```
   ✅ Logged in as Vix's Services#4498
   📡 Registering 11 slash commands globally…
   ✅ Slash commands registered!
   ```
4. Your bot is now online 24/7 — even when you close Railway and GitHub

---

## Where Is My Data Stored?

Your products, categories, and ticket settings are saved in `data/db.json` inside the container. This means:

- ✅ Data survives bot restarts (crashes, Railway reboots)
- ⚠️ Data resets if you **redeploy** (push new code to GitHub)

**To keep your data safe when updating the bot:**
Before pushing any new code, copy your current `db.json` from Railway:
1. Railway → your service → **Shell** tab
2. Run: `cat data/db.json`
3. Copy the output and paste it over your local `data/db.json` before pushing

---

## Updating the Bot Later

If you want to make changes:
1. Edit the files on your computer
2. Go to your GitHub repo → upload the changed files → commit
3. Railway auto-deploys in about 2 minutes

---

## Free Plan Limits (Railway Hobby)

Railway's free Starter plan gives you **$5 of credit per month**, which is more than enough to run a Discord bot (a bot uses roughly $0.50–$1.00/month).

You do NOT need to enter a credit card to use the free tier.

---

## Getting Your Discord Token & Client ID

If you need these:

**Discord Token:**
1. Go to https://discord.com/developers/applications
2. Click your bot application
3. Click **Bot** in the left sidebar
4. Click **Reset Token** → copy it

**Client ID:**
1. Same page → click **General Information**
2. Copy the **Application ID**
