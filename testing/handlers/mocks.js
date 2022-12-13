const { existsSync, writeFileSync } = require('fs');
const ethers = require('ethers');
const Evm = require('../../routes/utils/evm');
const AccessController = require('../../routes/utils/AccessController');

const evm = new Evm();
const ctrl = new AccessController();
const provider = evm.network.provider('polygonMumbai');
const newWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return wallet._signingKey();
};

// create new wallets if missing
let pathTo;

pathTo = './privateWallet.json';
if (!existsSync(pathTo))
  writeFileSync(pathTo, JSON.stringify(newWallet(), undefined, 2));

pathTo = './testWallets.json';
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
  require('../../privateWallet.json').privateKey,
  provider
);

const wallets = require('../../testWallets.json').data.map(
  (data) => new ethers.Wallet(data.privateKey, provider)
);

module.exports = {
  ctrl,
  evm,
  deployer,
  wallets,
  provider,
};
