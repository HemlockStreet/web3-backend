const { ethers } = require('ethers');
const { rejection } = require('../validation');

module.exports = class LoginMiddleware {
  constructor(ctrl) {
    this.ctrl = ctrl;
  }

  /**
   * @dev login step 1 (GET /login)
   * Makes sure the client is sending an address for getting the challenge token.
   */
  evmAddr(req, res, next) {
    const address = req.body.credentials?.address;
    if (!address) return rejection('credentials?.address', 'missing', res);
    if (!ethers.utils.isAddress(address))
      return rejection('credentials.address', 'invalid', res);
    next();
  }

  /**
   * @dev login step 2 (POST /login)
   * Makes sure the client sends a valid signature
   */
  ctknSig(req, res, next) {
    const rejectAs = (nature) => rejection('login signature', nature, res);

    // expect login arguments
    const credentials = req.body.credentials;
    if (!credentials)
      return rejection('login signature - credentials', 'missing', res);
    if (!credentials.message)
      return rejection('login signature - message', 'missing', res);
    if (!credentials.signature)
      return rejection('login signature - signature', 'missing', res);
    if (!credentials.address)
      return rejection('login signature - address', 'missing', res);

    // expect valid signature
    const { message, signature, address } = credentials;
    let signer;
    try {
      signer = ethers.utils.verifyMessage(message, signature);
    } catch {
      return rejectAs('invalid');
    }
    if (address !== signer) return rejectAs('stolen');

    // validate ctkn
    const ip = req.ip;
    const decoded = this.ctrl.tkn.utils.verify('atkn', message);
    if (!decoded || decoded.ip !== ip) return rejection('ctkn', 'invalid', res);

    // set userData and goto next
    req.userData = { address, ip, timestamp: new Date() };
    next();
  }

  /**
   * @dev login step 3 (PATCH & DELETE /login)
   * Makes sure the client has a valid refresh token for logout and refresh
   */
  rtkn(req, res, next) {
    const rejectAs = (nature) => rejection('rtkn', nature, res);

    // expect valid token
    const rtkn = req.cookies.rtkn;
    if (!rtkn) return rejectAs('missing');
    const decoded = this.ctrl.tkn.utils.verify('rtkn', rtkn);
    if (!decoded) return rejectAs('expired');
    const { address, ip } = decoded;
    if (!this.ctrl.tkn.isLoggedIn(address)) return rejectAs('expired');
    if (req.ip !== decoded.ip) return rejectAs('invalid');

    // set userData and goto next
    req.userData = { address, ip, timestamp: new Date() };
    next();
  }
};
