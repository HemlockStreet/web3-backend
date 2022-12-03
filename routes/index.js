const ethers = require('ethers');
const validate = require('./utils/validation');

const Evm = require('./utils/evm');
const handleError = require('./utils/errorHandler');
const Auth = require('./utils/auth');

const pass = (res) => res.status(200).json({ info: 'ok' });

const cookieOpts = {
  httpOnly: true,
  // secure: true,
  // domain: 'mywebsite.com'
};

module.exports = (app) => {
  let evm = new Evm();
  let auth = new Auth();

  app.get('/sitrep', (req, res) =>
    res.status(200).json({
      deployer: evm.wallet.address,
      networks: evm.network.list,
    })
  );

  app
    .route('/login')
    .post(validate.signature, async (req, res) => {
      const { atkn, rtkn } = auth.tkn.generate(req.userData);
      auth.sesh.add(rtkn);

      res.cookie('atkn', atkn, cookieOpts);
      res.cookie('rtkn', rtkn, cookieOpts);
      const iat = auth.tkn.decode(atkn).iat;

      res.status(200).json({ iat });
    })
    .patch(validate.refreshToken, (req, res) => {
      auth.sesh.rm(req.cookies.rtkn);

      const { atkn, rtkn } = auth.tkn.generate(req.userData);
      auth.sesh.add(rtkn);

      res.cookie('atkn', atkn, cookieOpts);
      res.cookie('rtkn', rtkn, cookieOpts);
      const iat = auth.tkn.decode(atkn).iat;

      res.status(200).json({ iat });
    })
    .delete(validate.refreshToken, (req, res) => {
      const { rtkn } = req.cookies;
      if (!auth.sesh.all.includes(rtkn))
        return res
          .status(403)
          .json({ info: 'validation.refreshToken - invalid' });
      auth.sesh.rm(rtkn);

      auth.sesh.clean();

      res.clearCookie('rtkn');
      res.clearCookie('atkn');
      pass(res);
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
        res.status(200).json(msg(`My balance is ${value} ${currency}.`));
      } catch (err) {
        handleError(res, 'balance', 'GET', err);
      }
    })
    .post(validate.accessToken, async (req, res) => {
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
