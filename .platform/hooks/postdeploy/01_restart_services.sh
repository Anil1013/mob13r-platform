#!/bin/bash
# Post-deploy script to restart Node and NGINX
echo "Restarting services after deploy..."
sudo systemctl restart nginx || true
sudo systemctl restart node || true
echo "✅ NGINX and Node restarted successfully."
