const { ethers } = require('ethers');
const Wallet = require('./Wallet');
const Network = require('./Network');
const { rejection } = require('../validation');

class Evm {
  constructor() {
    this.update();
  }

  update() {
    this.wallet = new Wallet();
    this.network = new Network(this.wallet);
  }

  sigValidation(req, res, next) {
    const rejectAs = (nature) => rejection('signature', nature, res);
    try {
      const { message, signature, address } = req.body.user;
      const signer = ethers.utils.verifyMessage(message, signature);
      if (address !== signer) return rejectAs('stolen');
      req.userData = { address, ip: req.ip };
      next();
    } catch {
      return rejectAs('invalid');
    }
  }

  sitrep(req, res) {
    res.status(200).json({
      deployer: this.wallet.address,
      networks: this.network.list,
    });
  }
}

module.exports = Evm;
