const fs = require('fs');
const ethers = require('ethers');

class Wallet {
  constructor() {
    const wPath = './routes/utils/evm/WalletConfig.json';
    let wallet;
    if (fs.existsSync(wPath)) {
      this.key = require('./WalletConfig.json').privateKey;
      wallet = new ethers.Wallet(this.key);
      this.address = wallet.address;
    } else {
      wallet = ethers.Wallet.createRandom();
      const signingKey = wallet._signingKey();
      this.key = signingKey.privateKey;
      this.address = wallet.address;
      fs.writeFileSync(wPath, JSON.stringify(signingKey, undefined, 2));
    }
  }
}

module.exports = Wallet;
