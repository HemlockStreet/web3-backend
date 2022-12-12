module.exports = (app, valid, evm, ctrl) => {
  app
    .route('/user')
    .get(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => ctrl.view(req, res) // whois in group members
    )
    .put(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => ctrl.promote(req, res) // promote members
    )
    .patch(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => ctrl.demote(req, res) // demote members
    )
    .delete(
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => ctrl.eject(req, res) // remove members
    );
};
