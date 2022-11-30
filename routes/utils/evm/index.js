const ethers = require('ethers');
const Wallet = require('./Wallet');
const Network = require('./Network');

const msg = (info) => {
  return { info };
};

class Evm {
  constructor() {
    this.update();
  }

  update() {
    this.wallet = new Wallet();
    this.network = new Network(this.wallet);
  }

  validateSignature(req, res, next) {
    const base = '@evm.validateSignature - ';
    try {
      const {
        user: { message, signature, address },
      } = req.body;
      const msgSigner = ethers.utils.verifyMessage(message, signature);

      if (address !== msgSigner)
        return res.status(400).json(msg(base + `user.address !== msgSigner`));

      req.user = address;
      next();
    } catch (err) {
      return res.status(400).json(msg(base + err.toString()));
    }
  }
}

module.exports = Evm;
