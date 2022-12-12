const RoleManager = require('./RoleManager');
const TokenUtils = require('./TokenUtils');

module.exports = class TokenManager {
  // clear all tokens
  clear() {
    this.data = {};
    return true;
  }

  constructor() {
    this.utils = new TokenUtils();
    this.roles = new RoleManager();
    this.clear();
  }

  logUserOut(address) {
    delete this.data[address];
  }

  // is the user logged in?
  isLoggedIn(address) {
    const rtkn = this.data[address];
    if (!rtkn) return;
    const decoded = this.utils.verify('rtkn', rtkn);
    if (decoded) return decoded;
    this.logUserOut(address);
    return;
  }

  // user log-in (require address = signer)
  logUserIn(address, tokens) {
    if (!this.roles.hasUser(address)) this.roles.addUser(address);
    this.data[address] = tokens.rtkn;
    return {
      atkn: this.utils.verify('atkn', tokens.atkn),
      rtkn: this.isLoggedIn(address),
    };
  }
};
