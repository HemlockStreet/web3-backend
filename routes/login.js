/**
 * @dev after metamask login, user must GET /login in order to be issued a challenge string.
 * The user then signs the string and returns it within 5 minutes. If the challenge expires,
 * another challenge must be issued in order to POST /login.
 */
module.exports = (app, valid, ctrl) => {
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
      (req, res, next) => valid.access.roles(['root', 'admin'], req, res, next),
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
};
