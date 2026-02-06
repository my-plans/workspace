#!/bin/bash
# vercel-setup-node-api.sh - Setup Vercel config for Node.js API

set -e

PROJECT_DIR="${1:-.}"
ENTRY_FILE="${2:-server.js}"

cd "$PROJECT_DIR"

cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "$ENTRY_FILE",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "$ENTRY_FILE"
    }
  ]
}
EOF

echo "✅ Created vercel.json for Node.js API"
echo "   Entry: $ENTRY_FILE"
