const Evm = require('./utils/evm');
const AccessController = require('./utils/AccessController');
// const { ethers } = require('ethers');
// new ethers.providers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com')
//   .getNetwork()
//   .then((data) => console.log(data));

const ctrl = new AccessController();
let evm = new Evm();

module.exports = (app) => {
  app.route('/sitrep').get((req, res) => evm.sitrep(req, res));

  /**
   * @dev after metamask login, user must GET /login in order to be issued a challenge string.
   * The user then signs the string and returns it within 5 minutes. If the challenge expires,
   * another challenge must be issued in order to POST /login.
   */
  app
    .route('/login')
    .get((req, res) => ctrl.issueChallenge(req, res)) // get challenge
    .post(
      (req, res, next) => ctrl.chValidation(req, res, next),
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
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => ctrl.promote(req, res) // promote members
    )
    .patch(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
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
    .route('/network/:alias')
    .get(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => evm.viewNetwork(req, res) // view network details
    )
    .put(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => evm.editNetwork(req, res) // manage network details
    )
    .delete(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => evm.removeNetwork(req, res) // remove network
    );

  app
    .route('/balance/:alias')
    .get(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => evm.fetchBalance(req, res) // fetch deployer balance
    )
    .patch(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.requireTier(5, req, res, next),
      (req, res) => evm.sendBalance(req, res) // send deployer balance
    );
};
