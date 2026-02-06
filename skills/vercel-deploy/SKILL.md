---
name: vercel-deploy
description: "Auto-deploy web applications to Vercel. Use when the user wants to deploy frontend apps, full-stack apps, or APIs to Vercel for hosting. Handles project linking, environment variables, and GitHub integration for auto-deploy on push."
---

# Vercel Deploy Skill

Auto-deploy web applications to Vercel hosting platform.

## Prerequisites

- `vercel` CLI must be installed
- User must be logged in (`vercel login`) or have `VERCEL_TOKEN` env var
- Git repo must be pushed to GitHub (for auto-deploy on push)

## Quick Deploy

Deploy current directory to Vercel:

```bash
vercel --yes
```

Deploy to production:

```bash
vercel --prod
```

## Project Types

### Static Site (HTML/CSS/JS)

No build step required. Vercel serves files directly.

### React/Vue/Svelte App

```bash
# Vercel auto-detects framework and runs build
vercel
```

### Node.js API (Express/Fastify)

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

Then deploy:

```bash
vercel
```

## GitHub Auto-Deploy Setup

Link Vercel project to GitHub for automatic deploys on push:

```bash
# In project directory
vercel --yes

# Then in Vercel dashboard, connect GitHub repo
# Or use:
vercel git connect
```

## Environment Variables

Set secrets for production:

```bash
vercel env add DATABASE_URL
vercel env add API_KEY
```

## Full Workflow

### 1. Prepare Project

Ensure `package.json` exists with build/start scripts if needed.

### 2. Create vercel.json (if needed)

For custom routing, serverless functions, or monorepos.

### 3. Deploy

```bash
vercel --yes
```

### 4. Get Production URL

```bash
vercel --prod
```

## Troubleshooting

**Not authenticated:**
```bash
vercel login
```

**Project not linked:**
```bash
vercel link
```

**Check deployment status:**
```bash
vercel list
```

**View logs:**
```bash
vercel logs <deployment-url>
```
