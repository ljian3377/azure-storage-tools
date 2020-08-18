# git clone https://github.com/ljian3377/azure-storage-tools.git

# install nvm
curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | bash
source ~/.bashrc

# install and set specific version of node.js as default
nvm install v12.18.0
nvm alias default v12.18.0

npm install -g @types/node ts-node typescript

npm install