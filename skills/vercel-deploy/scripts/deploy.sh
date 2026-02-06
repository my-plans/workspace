#!/bin/bash
# vercel-deploy.sh - Deploy project to Vercel

set -e

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

echo "🚀 Deploying to Vercel..."

# Check if logged in
if ! vercel whoami &>/dev/null; then
    echo "⚠️  Not logged in to Vercel. Run: vercel login"
    exit 1
fi

# Deploy
vercel --yes

echo "✅ Deployed! Check Vercel dashboard for URL."
