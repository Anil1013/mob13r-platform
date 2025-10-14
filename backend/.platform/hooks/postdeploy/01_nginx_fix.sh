#!/bin/bash
# ======================================================
# 🔧 Mob13r Postdeploy Script
# Purpose: Fix NGINX types_hash warnings after deploy
# Author: ChatGPT (for Anil @ Mob13r)
# Location: .platform/hooks/postdeploy/01_nginx_fix.sh
# ======================================================

set -e

echo "🚀 Applying NGINX types_hash fix after deployment..."

# Ensure NGINX conf.d directory exists
mkdir -p /etc/nginx/conf.d

# Write fix config file
cat <<EOF >/etc/nginx/conf.d/types_hash_fix.conf
# ✅ Mob13r NGINX Hash Optimization Fix
types_hash_max_size 2048;
types_hash_bucket_size 128;
EOF

# Test configuration
echo "🧪 Validating NGINX configuration..."
nginx -t || { echo "❌ NGINX config test failed"; exit 1; }

# Reload NGINX gracefully
echo "♻️ Reloading NGINX..."
systemctl reload nginx

echo "✅ NGINX hash fix applied successfully on Mob13r instance!"
