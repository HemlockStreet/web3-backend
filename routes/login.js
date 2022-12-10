/**
 * @dev after metamask login, user must GET /login in order to be issued a challenge string.
 * The user then signs the string and returns it within 5 minutes. If the challenge expires,
 * another challenge must be issued in order to POST /login.
 */
module.exports = (app, evm, ctrl) => {
  app
    .route('/login')
    .get((req, res) => ctrl.issueChallenge(req, res)) // get challenge
    .post(
      (req, res, next) => ctrl.chValidation(req, res, next),
      (req, res, next) => evm.sigValidation(req, res, next),
      (req, res) => ctrl.login(req, res) // login
    )
    .patch(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.login(req, res) // refresh
    )
    .delete(
      (req, res, next) => ctrl.rtknValidation(req, res, next),
      (req, res) => ctrl.logout(req, res) // logout
    );
};
