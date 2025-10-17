#!/bin/bash
echo "Setting Node.js version from package.json"
NODE_VERSION=$(cat package.json | jq -r '.engines.node // "22"')
export NVM_DIR="/root/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION
