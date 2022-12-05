const ethers = require('ethers');
const Evm = require('./utils/evm');
const AccessController = require('./utils/AccessController');
const handleError = require('./utils/errorHandler');

const ctrl = new AccessController();
let evm = new Evm();

module.exports = (app) => {
  app.route('/sitrep').get(evm.sitrep);

  app
    .route('/login')
    .get(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.metadata(req, res) // metadata
    )
    .post(
      (req, res, next) => evm.sigValidation(req, res, next),
      (req, res) => ctrl.login(req, res) // login
    )
    .put(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.logout(req, res) // logout
    )
    .patch(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.login(req, res) // refresh
    )
    .delete(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.logoutAll(req, res) // logout all
    );

  /**
   * @dev put/patch/delete all log the user out
   * @param group pick from ['wheel', 'management', 'employee', 'client']
   */
  app
    .route('/manage/:group')
    .get(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => ctrl.view(req, res) // whois in group members
    )
    .put(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => ctrl.promote(req, res) // promote members
    )
    .patch(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => ctrl.demote(req, res) // demote members
    )
    .delete(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => ctrl.eject(req, res) // remove members
    );

  /**
   * @param alias the object key, chainId, name, or network nickname
   * of the targeted network (in order of increasing search priority).
   * For best results, use the object key or chain ID when querying
   * for network information. evm.network.info targets the file
   * ./utils/evm/ChainConfig.json. For more information, go there.
   */
  app
    .route('/config/:alias')
    .get((req, res, next) => ctrl.atknValidation(req, res, next)) // view network details
    .put((req, res, next) => ctrl.atknValidation(req, res, next)) // add new network
    .patch((req, res, next) => ctrl.atknValidation(req, res, next)) // manage network details
    .delete((req, res, next) => ctrl.atknValidation(req, res, next)); // remove network

  app
    .route('/balance/:alias')
    .get(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      async (req, res) => {
        try {
          const { alias } = req.params;
          const value = await evm.network.balance(alias);
          const currency = evm.network.info(alias).nativeCurrency.name;
          res.status(200).json(msg(`My balance is ${value} ${currency}.`));
        } catch (err) {
          handleError(res, 'balance', 'GET', err);
        }
      }
    )
    .post(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      async (req, res) => {
        try {
          const { alias } = req.params;
          const signer = evm.network.signer(alias);
          const explorer = evm.network.explorer(alias);
          const { amount, to } = req.body;
          const value = ethers.utils.parseEther(amount);

          const tx = await signer.sendTransaction({ to, value });
          const receipt = await tx.wait();

          res
            .status(200)
            .json(msg(`${explorer}/tx/${receipt.transactionHash}`));
        } catch (err) {
          handleError(res, 'balance', 'POST', err);
        }
      }
    );
};
