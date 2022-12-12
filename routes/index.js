const Evm = require('./utils/evm');
const AccessController = require('./utils/AccessController');
const Middleware = require('./utils/middleware');

module.exports = (app) => {
  const evm = new Evm();
  const ctrl = new AccessController();
  const valid = new Middleware(evm, ctrl);

  app.route('/sitrep').get((req, res) => evm.sitrep(req, res));

  require('./login')(app, valid, ctrl);
  // require('./user')(app, valid, evm, ctrl);
  require('./network')(app, valid, evm, ctrl);
  // require('./wallet')(app, valid, evm, ctrl);

  // app.route('/command').post(
  // (req, res, next) => ctrl.rtknValidation(req, res, next),
  // (req, res, next) => ctrl.tierValidation(5, req, res, next),
  // (req, res) => ctrl.logoutAll(req, res) // logout all
  // );
};
