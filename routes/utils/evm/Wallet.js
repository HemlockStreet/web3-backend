const LocalData = require('../data/LocalData');
const ethers = require('ethers');

module.exports = class Wallet extends LocalData {
  extract() {
    this.key = this.data.privateKey;
    this.address = new ethers.Wallet(this.key).address;
  }

  create() {
    const wallet = ethers.Wallet.createRandom();
    const signingKey = wallet._signingKey();
    if (this.opts.testing.Wallet) console.log({ ingressed: signingKey });
    super.ingress(signingKey);
  }

  constructor(opts = { testing: {} }) {
    super(`${__dirname}/WalletConfig.json`);
    this.opts = opts;
    if (!this.data.privateKey) this.create();
    this.extract();
    if (this.opts.testing.Wallet) console.log(this);
  }
};
