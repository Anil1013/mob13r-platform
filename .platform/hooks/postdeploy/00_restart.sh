#!/bin/bash
echo "🔁 Restarting Node after deploy..."
sudo systemctl restart web.service || true
