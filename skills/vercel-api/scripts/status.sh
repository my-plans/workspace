#!/bin/bash
# status.sh - Check Vercel deployment status

set -e

PROJECT_NAME="${1:-workspace}"

# Load token
if [ -z "$VERCEL_TOKEN" ] && [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found"
    exit 1
fi

echo "📊 Deployment status for: $PROJECT_NAME"

# Get project
PROJECT=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME" \
    -H "Authorization: Bearer $VERCEL_TOKEN")

PROJECT_ID=$(echo "$PROJECT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project not found"
    exit 1
fi

# Get latest deployment
DEPLOYMENTS=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=5" \
    -H "Authorization: Bearer $VERCEL_TOKEN")

echo ""
echo "Recent deployments:"
echo "$DEPLOYMENTS" | grep -o '"state":"[^"]*","createdAt":[0-9]*,"url":"[^"]*"' | head -5 | while read line; do
    STATE=$(echo "$line" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
    URL=$(echo "$line" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "   $STATE - https://$URL"
done
