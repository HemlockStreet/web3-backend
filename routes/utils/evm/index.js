const { ethers } = require('ethers');

const { rejection } = require('../validation');

const Wallet = require('./Wallet');
const Network = require('./Network');

class Evm {
  constructor() {
    this.wallet = new Wallet();
    this.network = new Network();
  }

  // GET /sitrep
  sitrep(req, res) {
    console.log(`sitrep requested from ${req.ip} at ${new Date()}`);
    res.status(200).json({
      deployer: this.wallet.address,
      networks: this.network.publicInfo(),
    });
  }

  sigValidation(req, res, next) {
    const rejectAs = (nature) => rejection('signature', nature, res);

    // expect login arguments
    const user = req.body.user;
    if (!user) rejectAs('missing');
    // expect valid signature
    let signer;
    try {
      signer = ethers.utils.verifyMessage(user.message, user.signature);
    } catch {
      return rejectAs('invalid');
    }
    // expect address match
    if (user.address !== signer) return rejectAs('stolen');

    // set SOME userData and goto next
    req.userData = { address: user.address, ip: req.ip, timestamp: new Date() };
    next();
  }

  netValidation(req, res, next) {
    try {
      const { network } = req.body;
      this.network.info(network);
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

  // GET /network
  viewNetwork(req, res) {
    res.status(200).json(this.network.info(req.network));
  }

  // PUT /network
  async editNetwork(req, res) {
    const alias = req.network;
    const verdict = await this.network.register(
      alias,
      req.body.args.networkDetails
    );

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

  // DELETE /network
  async removeNetwork(req, res) {
    const alias = req.network;

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

  // GET /balance
  async fetchBalance(req, res) {
    const alias = req.network;
    const value = await this.network.balance(alias, this.wallet.address);
    const currency = this.network.info(alias).nativeCurrency.name;
    res.status(200).json({ info: `My balance is ${value} ${currency}.` });
  }

  // PATCH /balance
  async sendBalance(req, res) {
    const alias = req.network;
    const signer = this.network.signer(alias, this.wallet.key);
    const explorer = this.network.explorer(alias);

    try {
      const { value, to, type } = req.body.args.asset;

      let tx, info;

      if (type === 'gas') {
        const amount = ethers.utils.parseEther(value);
        tx = await signer.sendTransaction({ to, value: amount });

        info = `withdrew gas`;
      } else if (['ERC20', 'ERC721', 'ERC1155'].includes(type)) {
        const { contractAddress } = req.body.args;
        const { abi } = require(`./interfaces/${type}.json`);
        const token = new ethers.Contract(contractAddress, abi, signer);
        const from = this.wallet.address;

        if (type === 'ERC20') {
          const decimals = await token.decimals();
          const amount = (parseFloat(value) * 10 ** decimals).toString();
          tx = await token.transferFrom(from, to, amount);

          info = `withdrew ERC20`;
        } else if (type === 'ERC721') {
          const id = parseInt(value);
          tx = await token.transferFrom(from, to, id);

          info = `withdrew ERC721`;
        } else if (type === 'ERC1155') {
          const { bytes: data, valueId: rawId } = req.body.args;
          const id = parseInt(rawId); // type of token
          const amount = parseInt(value); // amount of token
          tx = token.safeTransferFrom(from, to, id, amount, data);

          info = `withdrew ERC1155`;
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
