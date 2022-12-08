const Evm = require('./utils/evm');
const Auth = require('./utils/auth');

const evm = new Evm();
const auth = new Auth();

module.exports = (app) => {
  /**
   * @dev informs the user of what networks are available server-side
   * and what the server's EVM address is.
   */
  app.route('/sitrep').get((req, res) => evm.report(req, res));

  /**
   * @dev this is not entirely secure since people can just steal
   * signatures to impersonate another user. There needs to be some
   * sort of "login challenge".
   * @dev users can POST log in requests multiple times and overload
   * us with tokens
   */
  app
    .route('/login')
    .post(
      (req, res, next) => auth.sigValidation(req, res, next),
      (req, res) => auth.handleLogin(req, res) // login
    )
    .patch(
      (req, res, next) => auth.rtknValidation(req, res, next), // get new rtkn & atkn
      (req, res) => auth.handleLogin(req, res) // refresh
    )
    .delete(
      (req, res, next) => auth.rtknValidation(req, res, next), // prevent randos from logging other people out
      (req, res) => auth.handleLogout(req, res) // logout
    );

  /**
   * @param alias the object key, chainId, name, or network nickname
   * of the targeted network (in order of increasing search priority).
   * For best results, use the object key or chain ID when querying
   * for network information. evm.network.info targets the file
   * ./utils/evm/ChainConfig.json. For more information, go there.
   */
  app
    .route('/balance/:alias')
    .get(
      (req, res, next) => auth.atknValidation(req, res, next),
      (req, res) => evm.showBalance(req, res) // external calls should be gated
    )
    .post(
      (req, res, next) => auth.atknValidation(req, res, next),
      (req, res) => evm.sendBalance(req, res) // any logged in user can extract funds
    );
};
