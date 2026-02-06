#!/bin/bash
# redeploy.sh - Trigger Vercel redeploy via API

set -e

PROJECT_NAME="${1:-workspace}"
FORCE="${2:-}"

# Load token from environment or .env
if [ -z "$VERCEL_TOKEN" ] && [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found"
    echo "   Set it: export VERCEL_TOKEN=your_token"
    exit 1
fi

echo "🚀 Triggering redeploy for: $PROJECT_NAME"

# Get project ID
PROJECT_RESPONSE=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME" \
    -H "Authorization: Bearer $VERCEL_TOKEN")

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project not found: $PROJECT_NAME"
    exit 1
fi

echo "   Project ID: $PROJECT_ID"

# Get latest deployment to extract git info
DEPLOYMENTS=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=1" \
    -H "Authorization: Bearer $VERCEL_TOKEN")

REPO_ID=$(echo "$DEPLOYMENTS" | grep -o '"repoId":[^,]*' | head -1 | cut -d':' -f2)
REF=$(echo "$DEPLOYMENTS" | grep -o '"ref":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$REPO_ID" ]; then
    echo "❌ No previous deployment found"
    exit 1
fi

# Trigger redeploy
echo "   Triggering new deployment..."

REDEPLOY=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$PROJECT_NAME\",
        \"gitSource\": {
            \"type\": \"github\",
            \"repoId\": $REPO_ID,
            \"ref\": \"${REF:-master}\"
        }
    }")

DEPLOY_URL=$(echo "$REDEPLOY" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
DEPLOY_ID=$(echo "$REDEPLOY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DEPLOY_URL" ]; then
    echo "✅ Redeploy triggered!"
    echo "   URL: https://$DEPLOY_URL"
    echo "   ID: $DEPLOY_ID"
    echo ""
    echo "⏳ Waiting for build to complete..."
    
    # Poll for status
    for i in {1..30}; do
        sleep 5
        STATUS=$(curl -s "https://api.vercel.com/v13/deployments/$DEPLOY_ID" \
            -H "Authorization: Bearer $VERCEL_TOKEN" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        echo "   Status: $STATUS"
        
        if [ "$STATUS" = "READY" ]; then
            echo ""
            echo "🎉 Deployment ready!"
            echo "   https://$DEPLOY_URL"
            exit 0
        elif [ "$STATUS" = "ERROR" ]; then
            echo ""
            echo "❌ Deployment failed"
            exit 1
        fi
    done
    
    echo ""
    echo "⏱️ Build still in progress, check: https://$DEPLOY_URL"
else
    echo "❌ Failed to trigger redeploy"
    echo "$REDEPLOY" | head -5
    exit 1
fi
