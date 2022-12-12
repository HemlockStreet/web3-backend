module.exports = (app, valid, evm, ctrl) => {
  app
    .route('/balance')
    .get(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res) => evm.fetchBalance(req, res) // fetch deployer balance
    )
    .patch(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => evm.sendBalance(req, res) // send deployer balance
    );
};
