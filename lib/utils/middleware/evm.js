const { ethers } = require('ethers');
const { rejection } = require('../validation');

module.exports = class EvmMiddleware {
  constructor(evm, auth) {
    this.evm = evm;
    this.auth = auth;
  }

  /**
   * @dev for routes that require signers or providers
   * Makes sure the network exists and is configured
   */
  network(req, res, next) {
    try {
      const { network } = req.body;
      if (!this.evm.network.info(network))
        throw new Error('invalid network').code(403);
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
