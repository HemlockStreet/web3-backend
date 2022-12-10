const Evm = require('./utils/evm');
const AccessController = require('./utils/AccessController');

module.exports = (app) => {
  const ctrl = new AccessController();
  const evm = new Evm();

  app.route('/sitrep').get((req, res) => evm.sitrep(req, res));

  require('./login')(app, evm, ctrl);
  require('./user')(app, evm, ctrl);
  require('./network')(app, evm, ctrl);
  require('./wallet')(app, evm, ctrl);

  app.route('/command').post(
    (req, res, next) => ctrl.rtknValidation(req, res, next),
    (req, res, next) => ctrl.tierValidation(5, req, res, next),
    (req, res) => ctrl.logoutAll(req, res) // logout all
  );
};
