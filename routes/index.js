const ethers = require('ethers');
const Evm = require('./utils/evm');
const AccessController = require('./utils/accessControl');

const handleError = require('./utils/errorHandler');

module.exports = (app) => {
  let evm = new Evm();
  const controller = new AccessController();

  app.route('/sitrep').get(evm.sitrep);

  app
    .route('/login')
    .get(controller.validateRefreshToken, controller.handleMetadata) // userData
    .post(evm.validateSignature, controller.handleLogin) // login
    .put(controller.validateRefreshToken, controller.handleLogout) // logout
    .patch(controller.validateRefreshToken, controller.handleLogin) // refresh
    .delete(controller.validateRefreshToken, controller.handleLogOutAll); // logout all

  app
    .route('/manage/::group')
    .get(controller.validateAccessToken) // whois in group members
    .put(controller.validateAccessToken) // promote members
    .patch(controller.validateAccessToken) // demote members
    .delete(controller.validateAccessToken); // remove members

  app
    .route('/config/::network')
    .get(controller.validateAccessToken) // view network details
    .put(controller.validateAccessToken) // add new network
    .patch(controller.validateAccessToken) // manage network details
    .delete(controller.validateAccessToken); // remove network

  /**
   * @param alias the object key, chainId, name, or network nickname
   * of the targeted network (in order of increasing search priority).
   * For best results, use the object key or chain ID when querying
   * for network information. evm.network.info targets the file
   * ./utils/evm/ChainConfig.json. For more information, go there.
   */
  app
    .route('/balance/:alias')
    .get(controller.validateAccessToken, async (req, res) => {
      try {
        const { alias } = req.params;
        const value = await evm.network.balance(alias);
        const currency = evm.network.info(alias).nativeCurrency.name;
        res.status(200).json(msg(`My balance is ${value} ${currency}.`));
      } catch (err) {
        handleError(res, 'balance', 'GET', err);
      }
    })
    .post(controller.validateAccessToken, async (req, res) => {
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
