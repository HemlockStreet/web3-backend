const { ethers } = require('ethers');
const { rejection } = require('../validation');

module.exports = class EvmMiddleware {
  constructor(evm, ctrl) {
    this.evm = evm;
    this.ctrl = ctrl;
  }

  /**
   * @dev for routes that require signers or providers
   * Makes sure the network exists and is configured
   */
  network(req, res, next) {
    try {
      const { network } = req.body;
      this.evm.network.info(network);
      req.network = network;
      next();
    } catch {
      rejection(
        `netValidation @${network ? network : 'undefined network'}`,
        'invalid',
        res
      );
    }
  }
};
