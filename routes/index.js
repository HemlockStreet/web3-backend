const ethers = require('ethers');

const Evm = require('./utils/evm');
const handleError = require('./utils/errorHandler');
const Auth = require('./utils/auth');

const msg = (info) => {
  return { info };
};

module.exports = (app) => {
  let evm = new Evm();
  let auth = new Auth();

  app.route('/').get((req, res) => {
    const serverAddress = evm.wallet.address;
    const availableNetworks = evm.network.list;
    if (!serverAddress) throw new Error('!serverAddress');
    if (!availableNetworks) throw new Error('!availableNetworks');
    res.status(200).json({ serverAddress, availableNetworks });
  });

  app
    .route('/signature')
    .post(evm.validateSignature, async (req, res) =>
      res.status(200).json(msg('Valid Signature'))
    );

  app
    .route('/login')
    .post(evm.validateSignature, async (req, res) => {
      try {
        const { ip, user } = req;
        const { accessToken, refreshToken } = auth.tokenize(user, ip);

        /// FIX M<E
        res
          .cookie('accessToken', accessToken, auth.opts)
          .cookie('refreshToken', refreshToken, auth.opts)
          .status(200)
          .json(msg('Logged In'));
      } catch (err) {
        handleError(res, 'login', 'POST', err);
      }
    })
    .patch((req, res) => auth.edit(req, res))
    .delete((req, res) => auth.del(req, res));

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
        res.status(200).json(msg(`My balance is ${value} ${currency}.`));
      } catch (err) {
        handleError(res, 'balance', 'GET', err);
      }
    })
    .post(auth.validate, async (req, res) => {
      try {
        const { alias } = req.params;
        const signer = evm.network.signer(alias);
        const explorer = evm.network.explorer(alias);
        const { amount, to } = req.body;
        const value = ethers.utils.parseEther(amount);

        const tx = await signer.sendTransaction({ to, value });
        const receipt = await tx.wait();

        res.status(200).json(msg(`${explorer}/tx/${receipt.transactionHash}`));
      } catch (err) {
        handleError(res, 'balance', 'POST', err);
      }
    });
};
