const { ethers } = require('ethers');
const LocalData = require('../data/LocalData');

module.exports = class Network extends LocalData {
  update(log = false) {
    super.egress();
    if (this.opts.testing.Network && log) console.log({ egressed: this.data });
  }

  constructor(opts = { testing: {} }) {
    super(`${__dirname}/ChainConfig.json`);
    this.opts = opts;
    this.update(true);
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
        ens: details.ens?.address,
        multicall: details.multicall?.address,
        publicRpc: details.rpc,
        explorer: details.explorer.url,
      };
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

    if (entry) return entry;
    throw new Error(`Evm.Network.info - could not find ${alias}`);
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
        await fetch(exUrl);
      } catch {
        throw new Error('invalid explorer url');
      }

      if (exApi !== '') {
        try {
          await fetch(exApi);
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
    this.data[this.info(alias).alias] = input;
    super.ingress(this.data);
    return 'pass';
  }

  remove(alias) {
    if (super.keys().length === 1) return;
    delete this.data[this.info(alias).alias];
    super.ingress(this.data);
    return true;
  }
};
