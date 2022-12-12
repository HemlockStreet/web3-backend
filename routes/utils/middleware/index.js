const LoginMiddleware = require('./login');
const AccessMiddleware = require('./access');
const EvmMiddleware = require('./evm');

module.exports = class Middleware {
  constructor(evm, ctrl) {
    this.login = new LoginMiddleware(ctrl);
    this.access = new AccessMiddleware(ctrl);
    this.evm = new EvmMiddleware(evm, ctrl);
  }
};
