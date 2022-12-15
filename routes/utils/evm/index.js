const { ethers } = require('ethers');

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

  // GET /network
  viewNetwork(req, res) {
    res.status(200).json(this.network.data);
  }

  // PUT /network
  async editNetwork(req, res) {
    const alias = req.body.network;
    if (!alias) return res.status(400).json({ info: '!req.body.network' });

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
    const from = this.wallet.address;

    const gasBalance = parseInt(
      (await this.network.provider(alias).getBalance(signer.address)).toString()
    );

    let tx, receipt, fees, balance, tokenOwner;
    try {
      const asset = req.body.args.asset;
      const { value, to, type } = asset;
      if (type === 'gas') {
        fees = await this.network.getGasWithdrawalFee(alias);
        const requiredAmount = fees * 2 + parseInt(value);

        if (gasBalance < requiredAmount)
          return res.status(400).json({
            info: 'insufficient gas balance',
            gasBalance,
            fees: requiredAmount,
          });

        tx = await signer.sendTransaction({ to, value });
      } else if (['ERC20', 'ERC721', 'ERC1155'].includes(type)) {
        const { contractAddress } = asset;
        const { abi } = require(`./interfaces/${type}.json`);
        const token = new ethers.Contract(contractAddress, abi, signer);
        if (['ERC20', 'ERC721'].includes(type)) {
          if (type === 'ERC20') {
            balance = parseInt(
              (await token.balanceOf(signer.address)).toString()
            );
            if (balance < parseInt(value))
              return res
                .status(400)
                .json({ info: 'insufficient token balance' });
          } else {
            tokenOwner = await token.ownerOf(value);
            if (tokenOwner !== signer.address)
              return res.status(400).json({
                info: 'evm.wallet !== tokenOwner',
                evmWallet: signer.address,
                tokenOwner,
              });
          }

          fees = await this.network.getTokenWithdrawalFee(
            alias,
            token,
            'transferFrom',
            [from, to, value]
          );
          if (gasBalance < fees * 2)
            return res.status(400).json({
              info: 'insufficient gas balance',
              gasBalance,
              fees: fees * 2,
            });

          tx = await token.transferFrom(from, to, value);
        } else if (type === 'ERC1155') {
          const { data, valueId } = asset;
          const method =
            typeof valueId === 'number'
              ? 'safeTransferFrom'
              : 'safeBatchTransferFrom';

          if (method === 'safeTransferFrom') {
            balance = parseInt(
              (await token.balanceOf(signer.address, valueId)).toString()
            );
            if (balance < value)
              return res
                .status(400)
                .json({ info: 'insufficient token balance' });
          } else {
            let temp = [];
            valueId.forEach((num) => temp.push(signer.address));
            balance = await token.balanceOfBatch(temp, valueId);
            balance.forEach((balanceOf) => {
              if (
                parseInt(balanceOf.toString()) <
                value[balance.indexOf(balanceOf)]
              )
                return res
                  .status(400)
                  .json({ info: 'insufficient token balance' });
            });
          }

          fees = await this.network.getTokenWithdrawalFee(
            alias,
            token,
            method,
            [from, to, valueId, value, data]
          );

          if (gasBalance < fees * 2)
            return res.status(400).json({
              info: 'insufficient gas balance',
              gasBalance,
              fees: fees * 2,
            });

          tx = await token[method](from, to, valueId, value, data);
        }
      } else throw new Error('invalid asset type');

      receipt = await tx.wait(2);

      const link = `${explorer}/tx/${receipt.transactionHash}`;

      const message = {
        info: `withdrew ${type}`,
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
