#!/bin/bash

# git clone https://github.com/ljian3377/azure-storage-tools.git
git clone https://github.com/Azure/azure-sdk-for-js.git

# install nvm
curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | bash
source ~/.nvm/nvm.sh

# install and set specific version of node.js as default
nvm install v12.18.0 && nvm alias default v12.18.0 && npm install -g @microsoft/rush @types/node autorest ts-node typescript
source ~/.bashrc