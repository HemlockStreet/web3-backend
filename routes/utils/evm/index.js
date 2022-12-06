const { ethers } = require('ethers');
const Wallet = require('./Wallet');
const Network = require('./Network');
const { rejection } = require('../validation');

class Evm {
  constructor() {
    this.wallet = new Wallet();
    this.network = new Network();
  }

  // GET /sitrep
  sitrep(req, res) {
    res.status(200).json({
      deployer: this.wallet.address,
      networks: this.network.publicInfo(),
    });
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

  netValidation(req, res, next) {
    const alias = req.params.alias;
    try {
      this.network.info(alias);
      next();
    } catch {
      rejection(
        `netValidation @${alias ? alias : 'undefined network'}`,
        'invalid',
        res
      );
    }
  }

  // GET /network/:alias
  viewNetwork(req, res) {
    res.status(200).json(this.network.info(req.params.alias));
  }

  // PUT /network/:alias
  async editNetwork(req, res) {
    const alias = req.params.alias;
    const verdict = await this.network.register(alias, req.body.args);

    let message = {};

    if (verdict !== 'pass') {
      message.info = `${alias} could not be updated`;
      message.verdict = verdict;
      return res.status(400).json(message);
    }

    message = {
      info: `${alias} added/updated`,
      by: req.userData.address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }

  // DELETE /network/:alias
  async removeNetwork(req, res) {
    const alias = req.params.alias;

    const success = {
      info: `${alias} removed from network config`,
      by: req.userData.address,
      timestamp: new Date(),
    };

    const failure = {
      info: `could not remove ${alias} - last network in config`,
    };

    if (!this.network.remove(alias)) res.status(403).json(failure);
    else res.status(200).json(success);
  }

  // GET /balance/:alias
  async fetchBalance(req, res) {
    const alias = req.params.alias;
    const value = await this.network.balance(alias, this.wallet.address);
    const currency = this.network.info(alias).nativeCurrency.name;
    res.status(200).json({ info: `My balance is ${value} ${currency}.` });
  }

  // PATCH /balance/:alias
  async sendBalance(req, res) {
    const alias = req.params.alias;
    const currency = this.network.info(alias).nativeCurrency.name;
    const signer = this.network.signer(alias, this.wallet.key);
    const explorer = this.network.explorer(alias);

    try {
      const { value, to, assetType } = req.body.args;

      let tx, info;

      if (assetType === 'gas') {
        const amount = ethers.utils.parseEther(value);
        tx = await signer.sendTransaction({ to, value: amount });

        info = `withdrew gas`;
      } else if (['ERC20', 'ERC721', 'ERC1155'].includes(assetType)) {
        const { contractAddress } = req.body.args;
        const { abi } = require(`./interfaces/${assetType}.json`);
        const token = new ethers.Contract(contractAddress, abi, signer);

        if (assetType === 'ERC20') {
          const decimals = await token.decimals();
          const amount = (parseFloat(value) * 10 ** decimals).toString();
          tx = await token.transferFrom(this.wallet.address, to, amount);

          info = `withdrew ERC20`;
        } else if (assetType === 'ERC721') {
          const id = parseInt(value);
          tx = await token.transferFrom(this.wallet.address, to, id);

          info = `withdrew ERC721`;
        } else if (assetType === 'ERC1155') {
          //
          info = `withdrew ERC1155`;
          throw new Error('ERC1155 endpoint not configured');
        }
      } else throw new Error('invalid asset type');

      const receipt = await tx.wait();
      const link = `${explorer}/tx/${receipt.transactionHash}`;

      const message = {
        info,
        tx: link,
        by: req.userData.address,
        timestamp: new Date(),
      };
      console.log(message);
      res.status(200).json({ tx: link });
    } catch (err) {
      res.status(400).json({ info: err.toString() });
    }
  }
}

module.exports = Evm;
