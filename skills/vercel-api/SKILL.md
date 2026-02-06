---
name: vercel-api
description: "Manage Vercel deployments via API using VERCEL_TOKEN. Trigger redeploys, check status, update project settings without browser. Use when user wants to deploy, redeploy, or manage Vercel projects programmatically."
---

# Vercel API Skill

Manage Vercel deployments via REST API.

## Prerequisites

- `VERCEL_TOKEN` environment variable set
- Vercel CLI logged in OR token provided

## Quick Commands

### Trigger Redeploy

```bash
bash skills/vercel-api/scripts/redeploy.sh <project-name>
```

### Check Deployment Status

```bash
bash skills/vercel-api/scripts/status.sh <project-name>
```

### List Projects

```bash
bash skills/vercel-api/scripts/list-projects.sh
```

## API Endpoints

Base: `https://api.vercel.com`

Auth: `Authorization: Bearer $VERCEL_TOKEN`

### Redeploy Latest

```bash
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "project-name",
    "gitSource": {
      "type": "github",
      "repoId": <repo-id>,
      "ref": "master"
    }
  }'
```

### Get Deployments

```bash
curl "https://api.vercel.com/v6/deployments?projectId=<project-id>" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

## Scripts Usage

All scripts read `VERCEL_TOKEN` from environment or `.env` file.

**Redeploy current project:**
```bash
bash skills/vercel-api/scripts/redeploy.sh workspace
```

**Force redeploy (bypass build cache):**
```bash
bash skills/vercel-api/scripts/redeploy.sh workspace --force
```
