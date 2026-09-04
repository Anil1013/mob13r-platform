#!/bin/bash
# Writes the Cloudflare Origin Certificate + Private Key to disk, from
# base64-encoded values stored in EB Environment Properties
# (CF_ORIGIN_CERT_B64 / CF_ORIGIN_KEY_B64). Runs on every deploy, before
# nginx starts — this is what lets nginx terminate HTTPS on port 443
# for the Cloudflare "Full (strict)" SSL mode, without a Load Balancer.
set -e

mkdir -p /etc/nginx/ssl

if [ -n "$CF_ORIGIN_CERT_B64" ] && [ -n "$CF_ORIGIN_KEY_B64" ]; then
  echo "$CF_ORIGIN_CERT_B64" | base64 -d > /etc/nginx/ssl/cf-origin.pem
  echo "$CF_ORIGIN_KEY_B64" | base64 -d > /etc/nginx/ssl/cf-origin.key
  chmod 600 /etc/nginx/ssl/cf-origin.key
  echo "✅ Cloudflare origin certificate written to /etc/nginx/ssl/"
else
  echo "⚠️  CF_ORIGIN_CERT_B64 / CF_ORIGIN_KEY_B64 not set — skipping SSL cert write. Port 443 will not work until these are set."
fi
