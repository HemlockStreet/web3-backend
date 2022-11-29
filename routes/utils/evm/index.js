const Wallet = require('./Wallet');
const Network = require('./Network');

class Evm {
  constructor() {
    this.wallet = new Wallet();
    this.network = new Network(this.wallet);
  }
}

module.exports = Evm;
