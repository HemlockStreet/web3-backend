const DataCache = require('../DataCache');
const ethers = require('ethers');

module.exports = class Wallet extends DataCache {
  extract() {
    this.key = this.data.privateKey;
    this.address = new ethers.Wallet(this.key).address;
  }

  create() {
    const wallet = ethers.Wallet.createRandom();
    const signingKey = wallet._signingKey();
    super.ingress(signingKey);
  }

  constructor() {
    super(`${__dirname}/WalletConfig.json`);
    if (!this.data.privateKey) this.create();
    this.extract();
  }
};
