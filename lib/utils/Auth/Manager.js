const UserInfo = require('./UserInfo');
const Token = require('./Token');

module.exports = class Manager {
  // clear all tokens
  clear() {
    this.data = {};
    return true;
  }

  constructor() {
    this.tkn = new Token();
    this.roles = new UserInfo();
    this.clear();
  }

  logUserOut(address) {
    delete this.data[address];
  }

  // is the user logged in?
  isLoggedIn(address) {
    const rtkn = this.data[address];
    if (!rtkn) return;
    const decoded = this.tkn.verify('rtkn', rtkn);
    if (decoded) return decoded;
    this.logUserOut(address);
    return;
  }

  // user log-in (require address = signer)
  logUserIn(address, tokens) {
    if (!this.roles.hasUser(address)) this.roles.addUser(address);
    this.data[address] = tokens.rtkn;
    return {
      atkn: this.tkn.verify('atkn', tokens.atkn),
      rtkn: this.isLoggedIn(address),
    };
  }
};
