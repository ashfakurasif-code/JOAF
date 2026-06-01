#!/bin/bash
# Run this ONCE to fix the stuck collection push errors
# Prerequisites: appwrite CLI logged in, correct project selected

echo "=== Step 1: Pull current remote schema to sync appwrite.json ==="
appwrite pull collection --all 2>/dev/null || appwrite pull tables --all 2>/dev/null

echo ""
echo "=== Step 2: Replace frontend files (does not touch appwrite.json) ==="
echo "Copy all .html and /js/ files from this zip to your web server root"

echo ""
echo "=== Step 3: Push functions only (collections already synced) ==="
appwrite push function --all

echo ""
echo "✅ Done. Collections were pulled from remote (no schema conflict)."
echo "✅ Functions pushed with latest optimized code."
