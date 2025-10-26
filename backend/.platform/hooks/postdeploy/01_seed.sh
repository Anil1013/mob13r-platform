#!/bin/bash
echo "🌱 Running DB seed automatically on deploy..."

# Run from current directory (no need to cd)
node seed.js || echo "⚠️ Seed failed — check logs"

