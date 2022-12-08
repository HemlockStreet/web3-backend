const ethers = require('ethers');
const Wallet = require('./Wallet');
const Network = require('./Network');

class Evm {
  constructor() {
    this.update();
  }

  update() {
    this.wallet = new Wallet();
    this.network = new Network(this.wallet);
  }

  report(req, res) {
    console.log(`${req.ip} requested a sitrep at ${new Date()}`);
    res.status(200).json({
      deployer: this.wallet.address,
      networks: this.network.list,
    });
  }

  async showBalance(req, res) {
    try {
      // fetch balance
      const { alias } = req.params;
      const value = await this.network.balance(alias);
      const currency = this.network.info(alias).nativeCurrency.name;

      // let us and the user know
      console.log(
        `${req.userData.address} requested ${alias} balance (${value} ${currency}).`
      );
      res.status(200).json({ info: `My balance is ${value} ${currency}.` });
    } catch (err) {
      res.status(400).json({ info: err.toString() });
    }
  }

  async sendBalance(req, res) {
    try {
      // translate inputs & ready vars
      const { alias } = req.params;
      const signer = this.network.signer(alias);
      const explorer = this.network.explorer(alias);
      const { args } = req.body;

      // send tx and await 1 confirmation
      const tx = await signer.sendTransaction({
        to: args.to,
        value: ethers.utils.parseEther(args.value),
      });
      const receipt = await tx.wait();

      // let us and the user know
      const txLink = `${explorer}/tx/${receipt.transactionHash}`;
      console.log(`${req.userData.address} made a withdrawal ${txLink}`);
      res.status(200).json({ info: txLink });
    } catch (err) {
      res.status(400).json({ info: err.toString() });
    }
  }
}

module.exports = Evm;
