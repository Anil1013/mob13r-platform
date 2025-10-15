#!/bin/bash
# ✅ Force EB to use Node.js 18.x and NPM 9.x before building
echo "Installing Node.js 18.x..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
node -v
npm -v
