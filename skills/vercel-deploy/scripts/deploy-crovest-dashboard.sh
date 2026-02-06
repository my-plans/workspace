#!/bin/bash
# deploy-crovest-dashboard.sh - Full deployment workflow for Crovest Dashboard

set -e

WORKSPACE_DIR="/home/ubuntu/.openclaw/workspace"
PROJECT_DIR="$WORKSPACE_DIR/crovest-dashboard"

echo "📦 Deploying Crovest Dashboard to Vercel..."

# Check Vercel auth
if ! vercel whoami &>/dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "   Run: vercel login"
    exit 1
fi

cd "$PROJECT_DIR"

# Check for backend
if [ -d "node-backend" ]; then
    echo "🔧 Setting up Node.js backend..."
    bash "$WORKSPACE_DIR/skills/vercel-deploy/scripts/setup-node-api.sh" node-backend server.js
    cd node-backend
    
    echo "🚀 Deploying backend..."
    vercel --yes
    
    echo ""
    echo "✅ Backend deployed!"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Check Vercel dashboard for deployment URL"
echo "   2. Add environment variables if needed:"
echo "      vercel env add DATABASE_URL"
echo "   3. Deploy to production:"
echo "      vercel --prod"
