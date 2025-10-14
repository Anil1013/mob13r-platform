#!/bin/bash
# ======================================================
# 🔧 Mob13r Postdeploy Script (Full Proxy Fix)
# Fixes NGINX type_hash warnings in both proxy & system layers
# ======================================================

set -e

echo "🚀 Applying full NGINX types_hash fix (proxy + system)..."

# Create both directories if missing
mkdir -p /etc/nginx/conf.d
mkdir -p /var/proxy/staging/nginx/conf.d

# Apply fix to both proxy and system configs
for target in /etc/nginx/conf.d /var/proxy/staging/nginx/conf.d; do
  cat <<EOF >${target}/types_hash_fix.conf
# ✅ Mob13r NGINX Hash Optimization Fix
types_hash_max_size 2048;
types_hash_bucket_size 128;
EOF
  echo "🛠 Applied fix to: ${target}"
done

# Validate NGINX
echo "🧪 Testing NGINX configuration..."
nginx -t || { echo "❌ NGINX config test failed"; exit 1; }

# Reload gracefully
echo "♻️ Reloading NGINX..."
systemctl reload nginx

# Restart the backend Node app
echo "🔁 Restarting backend (web.service)..."
systemctl restart web.service || true

echo "✅ All NGINX hash warnings fixed across proxy + system!"
