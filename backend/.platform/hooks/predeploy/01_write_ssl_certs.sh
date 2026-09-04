#!/bin/bash
# Writes the Cloudflare Origin Certificate + Private Key to disk, from
# AWS Systems Manager Parameter Store. Runs on every deploy, before
# nginx starts — this is what lets nginx terminate HTTPS on port 443
# for the Cloudflare "Full (strict)" SSL mode, without a Load Balancer.
#
# Uses SSM Parameter Store instead of EB Environment Properties —
# Elastic Beanstalk has a hard 4096-byte limit across ALL environment
# variables combined (names + values), and this app's existing 19+
# env vars plus a ~2KB certificate and ~1.7KB private key blew past
# that limit, causing environment-property saves to silently fail.
# SSM parameters aren't subject to that shared limit.
#
# Requires: the EC2 instance's IAM role needs ssm:GetParameter
# permission (AmazonSSMReadOnlyAccess or a scoped policy covering the
# /mob13r/cf-origin/* parameter path is enough).
#
# IMPORTANT: nginx's https.conf ALWAYS references these exact file
# paths. If they don't exist, nginx fails to start ENTIRELY — not just
# port 443, the whole app (including port 80) goes down. So this script
# must ALWAYS leave valid cert files in place, even before the real
# Cloudflare cert has been configured in SSM — a temporary self-signed
# certificate is generated as a safe placeholder in that case. It gets
# correctly overwritten with the real Cloudflare cert on the next
# deploy once the SSM parameters actually exist.
set -e

mkdir -p /etc/nginx/ssl

REGION="ap-south-1"
CERT_PARAM="/mob13r/cf-origin/cert"
KEY_PARAM="/mob13r/cf-origin/key"

CERT_VALUE=$(aws ssm get-parameter --name "$CERT_PARAM" --with-decryption --region "$REGION" --query "Parameter.Value" --output text 2>/dev/null || echo "")
KEY_VALUE=$(aws ssm get-parameter --name "$KEY_PARAM" --with-decryption --region "$REGION" --query "Parameter.Value" --output text 2>/dev/null || echo "")

if [ -n "$CERT_VALUE" ] && [ -n "$KEY_VALUE" ]; then
  echo "$CERT_VALUE" > /etc/nginx/ssl/cf-origin.pem
  echo "$KEY_VALUE" > /etc/nginx/ssl/cf-origin.key
  chmod 600 /etc/nginx/ssl/cf-origin.key
  echo "✅ Cloudflare origin certificate fetched from SSM Parameter Store"
else
  echo "⚠️  Could not fetch $CERT_PARAM / $KEY_PARAM from SSM (not set yet, or IAM role lacks ssm:GetParameter) — generating a temporary self-signed placeholder so nginx can still start."
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout /etc/nginx/ssl/cf-origin.key \
    -out /etc/nginx/ssl/cf-origin.pem \
    -subj "/CN=backend.mob13r.com" >/dev/null 2>&1
  chmod 600 /etc/nginx/ssl/cf-origin.key
fi
