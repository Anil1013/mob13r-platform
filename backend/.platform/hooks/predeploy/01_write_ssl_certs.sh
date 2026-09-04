#!/bin/bash
# Writes the Cloudflare Origin Certificate + Private Key to disk, from
# base64-encoded values stored in EB Environment Properties
# (CF_ORIGIN_CERT_B64 / CF_ORIGIN_KEY_B64). Runs on every deploy, before
# nginx starts — this is what lets nginx terminate HTTPS on port 443
# for the Cloudflare "Full (strict)" SSL mode, without a Load Balancer.
#
# IMPORTANT: nginx's https.conf ALWAYS references these exact file
# paths. If they don't exist, nginx fails to start ENTIRELY — not just
# port 443, the whole app (including port 80) goes down. So this script
# must ALWAYS leave valid cert files in place, even before the real
# Cloudflare cert has been configured — a temporary self-signed
# certificate is generated as a safe placeholder in that case. It gets
# correctly overwritten with the real Cloudflare cert on the next
# deploy once CF_ORIGIN_CERT_B64/CF_ORIGIN_KEY_B64 are actually set.
set -e

mkdir -p /etc/nginx/ssl

if [ -n "$CF_ORIGIN_CERT_B64" ] && [ -n "$CF_ORIGIN_KEY_B64" ]; then
  echo "$CF_ORIGIN_CERT_B64" | base64 -d > /etc/nginx/ssl/cf-origin.pem
  echo "$CF_ORIGIN_KEY_B64" | base64 -d > /etc/nginx/ssl/cf-origin.key
  chmod 600 /etc/nginx/ssl/cf-origin.key
  echo "✅ Cloudflare origin certificate written to /etc/nginx/ssl/"
else
  echo "⚠️  CF_ORIGIN_CERT_B64 / CF_ORIGIN_KEY_B64 not set — generating a temporary self-signed placeholder so nginx can still start."
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout /etc/nginx/ssl/cf-origin.key \
    -out /etc/nginx/ssl/cf-origin.pem \
    -subj "/CN=backend.mob13r.com" >/dev/null 2>&1
  chmod 600 /etc/nginx/ssl/cf-origin.key
fi
