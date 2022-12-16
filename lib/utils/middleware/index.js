const LoginMiddleware = require('./login');
const AccessMiddleware = require('./access');
const EvmMiddleware = require('./evm');

module.exports = class Middleware {
  constructor(evm, auth) {
    this.login = new LoginMiddleware(auth);
    this.access = new AccessMiddleware(auth);
    this.evm = new EvmMiddleware(evm, auth);
  }
};
