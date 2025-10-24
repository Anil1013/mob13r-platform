#!/bin/bash
echo "⚙️ Ensuring Node.js 20.x is installed..."
sudo dnf install -y nodejs-20 || sudo dnf install -y nodejs
