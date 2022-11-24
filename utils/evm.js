const fs = require('fs');
const ethers = require('ethers');

const walletKey = () => {
  const wPath = './utils/WalletConfig.json';
  if (fs.existsSync(wPath)) return require('./WalletConfig.json').privateKey;
  const wallet = ethers.Wallet.createRandom();
  const key = wallet._signingKey();
  fs.writeFileSync(wPath, JSON.stringify(key, undefined, 2));
  return wallet.privateKey;
};

const address = () => new ethers.Wallet(walletKey()).address;

const availableNetworks = () => Object.keys(require('./ChainConfig.json'));

const provider = (network) =>
  new ethers.providers.JsonRpcProvider(
    require('./ChainConfig.json')[network].rpc
  );

const signer = (network) => new ethers.Wallet(walletKey(), provider(network));

module.exports = { address, availableNetworks, provider, signer };
