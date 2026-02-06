#!/bin/bash
# list-projects.sh - List all Vercel projects

set -e

# Load token
if [ -z "$VERCEL_TOKEN" ] && [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found"
    exit 1
fi

echo "📋 Your Vercel Projects:"
echo ""

PROJECTS=$(curl -s "https://api.vercel.com/v9/projects" \
    -H "Authorization: Bearer $VERCEL_TOKEN")

echo "$PROJECTS" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read name; do
    echo "   • $name"
done
