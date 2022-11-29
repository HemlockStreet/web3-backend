const { ethers } = require('ethers');

class Network {
  constructor(wallet) {
    this.wallet = wallet;
    this.data = require('./ChainConfig.json');
    this.list = Object.keys(this.data);
  }

  info(alias) {
    const available = this.list;
    const data = this.data;
    if (available.includes(alias)) return data[alias];

    available.forEach((item) => {
      const { id, name, network } = data[item];
      if ([id, name, network].includes(alias)) return data[item];
    });

    throw new Error(`Evm.Network.info - could not find ${alias}`);
  }

  explorer(alias) {
    let info;
    try {
      info = this.info(alias);
      if (!info.explorer) throw new Error('!explorer');
      const url = info.explorer.url;
      if (!url) throw new Error('!explorer.url');
      return url;
    } catch (err) {
      throw new Error(
        `Evm.Network.explorer ${
          info ? `- ${err.toString()}\n` : `\n${err.toString()}`
        }`
      );
    }
  }

  provider(alias) {
    let info;
    try {
      info = this.info(alias);
      const rpc = info.rpc;
      if (!rpc) throw new Error('!rpc');
      return new ethers.providers.JsonRpcProvider(rpc);
    } catch (err) {
      throw new Error(
        `Evm.Network.provider ${
          info ? `- ${err.toString()}\n` : `\n${err.toString()}`
        }`
      );
    }
  }

  signer(alias) {
    try {
      return new ethers.Wallet(this.wallet.key, this.provider(alias));
    } catch (err) {
      throw new Error(`Evm.Network.signer\n${err.toString()}`);
    }
  }

  async balance(alias) {
    try {
      const result = await this.provider(alias).getBalance(this.wallet.address);
      return ethers.utils.formatEther(result);
    } catch (err) {
      throw new Error(`Evm.Network.balance\n${err.toString()}`);
    }
  }
}

module.exports = Network;
