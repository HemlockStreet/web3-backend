const TokenUtils = require('./TokenUtils');
const SessionTracker = require('./SessionTracker');

class Auth {
  update() {
    this.tkn = new TokenUtils();
    this.sesh = new SessionTracker();
  }

  constructor() {
    this.update();
  }
}

module.exports = Auth;
