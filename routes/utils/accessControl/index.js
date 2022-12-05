const { rejection } = require('../validation');
const SessionManager = require('./SessionManager');
const TokenUtils = require('./TokenUtils');

module.exports = class AccessController {
  constructor() {
    this.utils = new TokenUtils();
    this.sessions = new SessionManager();
  }

  tier(user) {
    return this.sessions.tier(user);
  }

  promote(user, to, fromIssuer) {
    return this.sessions.promote(user, to, fromIssuer);
  }

  demote(user, from, to, author) {
    return this.sessions.demote(user, from, to, author);
  }

  logOut(address) {
    return this.sessions.logOut(address);
  }

  logOutAll() {
    return this.sessions.clearAllSessions();
  }

  logIn(address, ip) {
    const tokens = this.utils.generate({ address, ip });
    if (this.sessions.logIn(address, tokens.rtkn)) return tokens;
    else return;
  }

  validateRefreshToken(req, res, next) {
    const rejectAs = (nature) => rejection('refreshToken', nature, res);
    const rtkn = req.cookies.rtkn;
    if (!rtkn) return rejectAs('missing');
    const decoded = this.utils.verify('rtkn', rtkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip, tier: this.tier(address) };
    next();
  }

  handleLogin(req, res) {
    const { address, ip } = req.userData;
    const { atkn, rtkn } = this.logIn(address, ip);
    const decoded = {
      atkn: this.utils.decode(atkn),
      rtkn: this.utils.decode(rtkn),
    };
    res
      .cookie('atkn', atkn, cookieOpts)
      .cookie('rtkn', rtkn, cookieOpts)
      .status(200)
      .json({
        atkn: { iat: decoded.atkn.iat, exp: decoded.atkn.exp },
        rtkn: { iat: decoded.rtkn.iat, exp: decoded.rtkn.exp },
      });
  }

  handleLogout(req, res) {
    const { address } = req.userData;
    this.logOut(address);
    res
      .clearCookie('rtkn')
      .clearCookie('atkn')
      .status(204)
      .json({ info: 'logged out' });
  }

  validateAccessToken(req, res, next) {
    const rejectAs = (nature) => rejection('accessToken', nature, res);
    const atkn = req.cookies.atkn;
    if (!atkn) return rejectAs('missing');
    const decoded = this.utils.verify('atkn', atkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip, tier: this.tier(address) };
    next();
  }
};
