const ethers = require('ethers');
const Evm = require('./utils/evm');
const handleError = require('./utils/errorHandler');

const sig = require('./utils/auth/signatures');
const encrypt = require('./utils/auth/encryption');

module.exports = (app) => {
  let evm = new Evm();

  app.route('/').get((req, res) => {
    try {
      const serverAddress = evm.wallet.address;
      const availableNetworks = evm.network.list;
      if (!serverAddress) throw new Error('!serverAddress');
      if (!availableNetworks) throw new Error('!availableNetworks');
      res.status(200).json({ serverAddress, availableNetworks });
    } catch (err) {
      handleError(res, 'home', 'GET', err);
    }
  });

  app
    .route('/auth')
    .get((req, res) => res.send(req.cookies))
    .post(async (req, res) => {
      const mtd = 'POST';
      try {
        const { user } = req.body;
        const { address, signature, message } = user;
        await sig.validate(message, signature, address);

        const now = new Date();
        const plain = address + signature + message + now;
        const hash = await encrypted.hash(plain, 16);
        res.cookie('auth', hash, { httpOnly: true });

        const data = { info: 'Cookie Established!' };
        res.status(200).json(data);
      } catch (err) {
        handleError(res, rte, mtd, err);
      }
    });

  /**
   * @param alias the object key, chainId, name, or network nickname
   * of the targeted network (in order of increasing search priority).
   * For best results, use the object key or chain ID when querying
   * for network information. evm.network.info targets the file
   * ./utils/evm/ChainConfig.json. For more information, go there.
   */
  app
    .route('/balance/:alias')
    .get(async (req, res) => {
      try {
        const { alias } = req.params;

        const value = await evm.network.balance(alias);
        const currency = evm.network.info(alias).nativeCurrency.name;

        const data = { info: `My balance is ${value} ${currency}.` };
        res.status(200).json(data);
      } catch (err) {
        handleError(res, 'balance', 'GET', err);
      }
    })
    .post(async (req, res) => {
      try {
        const { alias } = req.params;
        const { to, amount } = req.body;

        const value = ethers.utils.parseEther(amount);

        const signer = evm.network.signer(alias);
        const tx = await signer.sendTransaction({ to, value });
        const receipt = await tx.wait();
        console.log(tx);
        console.log(receipt);

        const explorer = evm.network.explorer(alias);
        const data = {
          info: `${explorer}/tx/${receipt.transactionHash}`,
        };
        res.status(200).json(data);
      } catch (err) {
        handleError(res, 'balance', 'POST', err);
      }
    });
};
