#!/bin/bash
echo "⚙️ EB Prebuild: Installing backend dependencies..."
cd /var/app/staging/backend
npm install --production
