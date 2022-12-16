const { existsSync, writeFileSync } = require('fs');
const ethers = require('ethers');
const Ethereum = require('../../lib/utils/Ethereum');
const Auth = require('../../lib/utils/Auth');

const evm = new Ethereum();
const auth = new Auth();
const provider = evm.network.provider('polygonMumbai');
const newWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return wallet._signingKey();
};

// create new wallets if missing
let pathTo;

pathTo = './testing/wallets/privateWallet.json';
if (!existsSync(pathTo))
  writeFileSync(pathTo, JSON.stringify(newWallet(), undefined, 2));

pathTo = './testing/wallets/testWallets.json';
if (!existsSync(pathTo))
  writeFileSync(
    pathTo,
    JSON.stringify(
      {
        data: [newWallet(), newWallet(), newWallet(), newWallet(), newWallet()],
      },
      undefined,
      2
    )
  );

// get signers
const deployer = new ethers.Wallet(
  require('../wallets/privateWallet.json').privateKey,
  provider
);

const wallets = require('../wallets/testWallets.json').data.map(
  (data) => new ethers.Wallet(data.privateKey, provider)
);

module.exports = {
  auth,
  evm,
  deployer,
  wallets,
  provider,
};
