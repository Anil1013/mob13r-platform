#!/bin/bash
cd /var/app/current/backend
echo "🚀 Running DB migrations..."
node src/migrate.js
echo "✅ Migration finished"
