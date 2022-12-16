const Ethereum = require('./utils/evm');
const Auth = require('./utils/Auth');
const Middleware = require('./utils/middleware');

module.exports = (app) => {
  const evm = new Ethereum();
  const auth = new Auth();
  const valid = new Middleware(evm, auth);

  app.route('/sitrep').get((req, res) => evm.sitrep(req, res));

  /**
   * @dev after metamask login, user must GET /login in order to be issued a challenge string.
   * The user then signs the string and returns it within 5 minutes. If the challenge expires,
   * another challenge must be issued in order to POST /login.
   */
  app
    .route('/login')
    .get(
      // (req, res, next) => valid.login.evmAddr(req, res, next),
      (req, res) => auth.getChallenge(req, res)
    )
    .post(
      (req, res, next) => valid.login.ctknSig(req, res, next),
      (req, res) => auth.login(req, res) // login
    )
    .put(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(5, req, res, next),
      (req, res) => auth.logoutAll(req, res) // refresh
    )
    .patch(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res) => auth.login(req, res) // refresh
    )
    .delete(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res) => auth.logout(req, res) // logout
    );

  app
    .route('/user')
    .get(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res) => auth.view(req, res) // whois in group members
    )
    .put(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res) => auth.editScope(req, res) // edit member Scope
    )
    .patch(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res) => auth.editRoles(req, res) // edit member roles
    )
    .delete(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res) => auth.eject(req, res) // remove members
    );

  /**
   * args: {
   *  network: string - alias,
   * }
   */
  app
    .route('/network')
    .get(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res, next) => valid.access.roles(['network'], req, res, next),
      (req, res) => evm.viewNetwork(req, res) // view network details
    )
    .put(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res, next) => valid.access.roles(['network'], req, res, next),
      (req, res) => evm.editNetwork(req, res) // manage network details
    )
    .delete(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res, next) => valid.access.roles(['network'], req, res, next),
      (req, res, next) => valid.evm.network(req, res, next),
      (req, res) => evm.removeNetwork(req, res) // remove network
    );

  app
    .route('/balance')
    .get(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(5, req, res, next),
      (req, res, next) => valid.access.roles(['finance'], req, res, next),
      (req, res, next) => valid.evm.network(req, res, next),
      (req, res) => evm.fetchBalance(req, res) // fetch deployer balance
    )
    .patch(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(5, req, res, next),
      (req, res, next) => valid.access.roles(['finance'], req, res, next),
      (req, res, next) => valid.evm.network(req, res, next),
      (req, res) => evm.sendBalance(req, res) // send deployer balance
    );
};
