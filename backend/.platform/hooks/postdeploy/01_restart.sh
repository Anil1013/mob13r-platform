#!/bin/bash
echo "🔁 EB Postdeploy: Restarting server..."
pkill node || true
cd /var/app/current/backend
npm start &
