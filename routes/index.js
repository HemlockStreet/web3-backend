const Evm = require('./utils/evm');
const AccessController = require('./utils/AccessController');
const Middleware = require('./utils/middleware');

module.exports = (app) => {
  const evm = new Evm();
  const ctrl = new AccessController();
  const valid = new Middleware(evm, ctrl);

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
      (req, res) => ctrl.getChallenge(req, res)
    )
    .post(
      (req, res, next) => valid.login.ctknSig(req, res, next),
      (req, res) => ctrl.login(req, res) // login
    )
    .put(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(5, req, res, next),
      (req, res) => ctrl.logoutAll(req, res) // refresh
    )
    .patch(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res) => ctrl.login(req, res) // refresh
    )
    .delete(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res) => ctrl.logout(req, res) // logout
    );

  app
    .route('/user')
    .get(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res) => ctrl.view(req, res) // whois in group members
    )
    .put(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res) => ctrl.editScope(req, res) // edit member Scope
    )
    .patch(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res, next) => valid.access.scope(3, req, res, next),
      (req, res) => ctrl.editRoles(req, res) // edit member roles
    )
    .delete(
      (req, res, next) => valid.login.rtkn(req, res, next),
      (req, res, next) => valid.access.atkn(req, res, next),
      (req, res) => ctrl.eject(req, res) // remove members
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
