#!/bin/bash
echo "Installing Node.js 20.x globally..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
node -v
npm -v

