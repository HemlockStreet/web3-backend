/**
 * args: {
 *  network: string - alias,
 * }
 */
module.exports = (app, valid, evm, ctrl) => {
  app
    .route('/network')
    .get(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => evm.viewNetwork(req, res) // view network details
    )
    .put(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => evm.editNetwork(req, res) // manage network details
    )
    .delete(
      (req, res, next) => evm.netValidation(req, res, next),
      (req, res, next) => ctrl.atknValidation(req, res, next),
      (req, res, next) => ctrl.tierValidation(5, req, res, next),
      (req, res) => evm.removeNetwork(req, res) // remove network
    );
};
