const { ethers } = require('ethers');
const LocalData = require('../data/LocalData');

module.exports = class Network extends LocalData {
  constructor() {
    super(`${__dirname}/ChainConfig.json`);
    super.egress();
  }

  publicInfo() {
    const available = super.keys();
    let result = {};
    available.forEach((name) => {
      const details = this.data[name];
      result[name] = {
        chainId: details.id,
        name: details.name,
        network: details.network,
        nativeCurrency: details.nativeCurrency,
        publicRpc: details.rpc,
        explorer: details.explorer.url,
      };
      if (details.ens) result[name].ens = details.ens.address;
      if (details.multicall) result[name].multicall = details.multicall.address;
    });
    return result;
  }

  info(alias) {
    const available = super.keys();
    let entry;
    if (available.includes(alias)) {
      entry = this.data[alias];
      entry.alias = alias;
    }

    available.forEach((item) => {
      const { id, name, network } = this.data[item];
      if ([id.toString(), name, network].includes(alias)) {
        entry = this.data[item];
        entry.alias = item;
      }
    });

    return entry;
  }

  explorer(alias) {
    return this.info(alias).explorer.url;
  }

  provider(alias) {
    const profile = this.info(alias);
    const endpoint = profile.privateRpc ? profile.privateRpc : profile.rpc;
    return new ethers.providers.JsonRpcProvider(endpoint);
  }

  signer(alias, key) {
    return new ethers.Wallet(key, this.provider(alias));
  }

  async balance(alias, address) {
    const result = await this.provider(alias).getBalance(address);
    return ethers.utils.formatEther(result);
  }

  async inspect(data) {
    let numbers, strings, addresses;
    let input = data;

    const deconstruct = () => {
      const {
        id,
        name,
        nativeCurrency: { name: ncName, symbol: ncSym, decimals: ncDec },
        rpc,
        explorer: { name: exName, url: exUrl, api: exApi },
      } = data;

      numbers = { id, ncDec };
      strings = { name, ncName, ncSym, rpc, exName, exUrl, exApi };
      addresses = {};

      if (data.ens && data.ens.address) addresses.eAddr = data.ens.address;
      strings.privateRpc = data.privateRpc ? data.privateRpc : rpc;
      input.privateRpc = strings.privateRpc;

      if (data.multicall) {
        const { address: mcAddr, blockCreated: mcBlockCreated } =
          data.multicall;
        numbers.mcBlockCreated = mcBlockCreated;
        addresses.mcAddr = mcAddr;
      }
    };

    // MULTICALL && ENS ADDRESSES ARE NOT VALIDATED ONCHAIN
    const typeCheck = () => {
      Object.keys(numbers).forEach((key) => {
        if (typeof numbers[key] !== 'number')
          throw new Error(`${key}(${num}) !== number`);
      });
      Object.keys(strings).forEach((key) => {
        if (typeof strings[key] !== 'string')
          throw new Error(`${key}(${string}) !== string`);
      });
      Object.keys(addresses).forEach((key) => {
        if (!ethers.utils.isAddress(addresses[key]))
          throw new Error(`${key}(${addr}) !== address`);
      });
    };

    // EXPLORER URL & API URL ARE ONLY TESTED WITH A GET REQUEST
    const urlCheck = async () => {
      const { rpc, exUrl, exApi } = strings;

      try {
        const testProvider = new ethers.providers.JsonRpcProvider(rpc);
        const net = await testProvider.getNetwork();
        if (net.chainId !== numbers.id) throw new Error(`chainId mismatch`);
        input.network = net.name;
      } catch (err) {
        if (err.toString() !== `chainId mismatch`)
          throw new Error('invalid rpc');
        else throw new Error(err.toString());
      }

      if (rpc !== input.privateRpc) {
        try {
          const testProvider = new ethers.providers.JsonRpcProvider(
            input.privateRpc
          );
          const net = await testProvider.getNetwork();
          if (net.chainId !== numbers.id) throw new Error(`chainId mismatch`);
          input.network = net.name;
        } catch (err) {
          if (err.toString() !== `chainId mismatch`)
            throw new Error('invalid private rpc');
          else throw new Error(err.toString());
        }
      }

      try {
        const response = await fetch(exUrl, { method: 'GET' });
        if (response.status !== 200) throw new Error();
      } catch {
        throw new Error('invalid explorer url');
      }

      if (exApi) {
        try {
          const response = await fetch(exApi, { method: 'GET' });
          if (response.status !== 200) throw new Error();
        } catch {
          throw new Error('invalid explorer api url');
        }
      }
    };

    try {
      deconstruct();
      typeCheck();
      await urlCheck();
      return input;
    } catch (err) {
      return err.toString();
    }
  }

  async register(alias, values) {
    const input = await this.inspect(values);
    if (typeof input === 'string') return input;
    // delete input.alias;
    // console.log(alias);
    this.data[alias] = input;
    super.ingress(this.data);
    return 'pass';
  }

  remove(alias) {
    if (super.keys().length === 1) return;
    delete this.data[alias];
    super.ingress(this.data);
    return true;
  }

  async getGasPrice(alias, printMe = false) {
    const provider = this.provider(alias);
    let result;
    const raw = await provider.getFeeData();
    let feeData = {};
    Object.keys(raw).forEach(
      (key) => (feeData[key] = parseInt(raw[key].toString()))
    );
    if (feeData.maxFeePerGas) result = feeData.maxFeePerGas;
    else result = parseInt((await provider.getGasPrice()).toString());

    if (printMe) console.log('feeData', feeData);
    return result;
  }

  async getGasWithdrawalFee(alias, printMe = false) {
    const gasPrice = await this.getGasPrice(alias, printMe);

    const gasLimit = 21000;
    const estimate = gasPrice * gasLimit;

    if (printMe) {
      console.log('gasPrice', gasPrice);
      console.log('estimate', estimate);
    }

    return estimate;
  }

  async getTokenWithdrawalFee(alias, token, method, args, printMe = false) {
    const gasPrice = await this.getGasPrice(alias, printMe);

    let raw = await token.estimateGas[method](...args);
    const interactionFee = parseInt(raw.toString());
    const estimate = gasPrice * interactionFee;

    if (printMe) {
      console.log('gasPrice', gasPrice);
      console.log('estimate', estimate);
    }
    return estimate;
  }
};
