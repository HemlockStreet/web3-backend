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

  async fetchBalance(req, res) {
    const alias = req.params.alias;
    try {
      const value = await this.network.balance(alias);
      const currency = this.network.info(alias).nativeCurrency.name;
      res.status(200).json({ info: `My balance is ${value} ${currency}.` });
    } catch (err) {
      rejection(
        `get balance @${alias ? alias : 'undefined network'}`,
        'invalid',
        res
      );
    }
  }

  async sendBalance(req, res) {
    const alias = req.params.alias;
    try {
      const currency = this.network.info(alias).nativeCurrency.name;
      const signer = this.network.signer(alias);
      const explorer = this.network.explorer(alias);
      const { amount, to } = req.body;
      const value = ethers.utils.parseEther(amount);
      let tx;
      tx = await signer.sendTransaction({ to, value });
      // ERC20 && ERC721
      const receipt = await tx.wait();
      const link = `${explorer}/tx/${receipt.transactionHash}`;

      const message = {
        info: `withdrew ${value} ${currency} to ${to}`,
        tx: link,
        by: req.userData.address,
        timestamp: new Date(),
      };
      console.log(message);
      res.status(200).json({ tx: link });
    } catch (err) {
      rejection(
        `send balance @${alias ? alias : 'undefined network'}`,
        'invalid',
        res
      );
    }
  }
}

module.exports = Evm;
