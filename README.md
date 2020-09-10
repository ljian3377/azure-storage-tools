## Get Started

### Unix-like

```bash
# install nvm
curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | bash
source ~/.nvm/nvm.sh

# install and set specific version of node.js as default
nvm install v12.18.0
nvm alias default v12.18.0

# install packages
npm install -g @types/node ts-node typescript && npm install -g @microsoft/rush
source ~/.bashrc
```
