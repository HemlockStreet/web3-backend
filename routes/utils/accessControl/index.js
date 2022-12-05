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

  logIn(address, ip, rtkn = false) {
    if (rtkn && !this.utils.verify('rtkn', rtkn)) return;
    const token = this.utils.generate({ address, ip });
    if (this.sessions.logIn(address, token)) return token;
    else return;
  }

  validateAccessToken(req, res, next) {
    const rejectAs = (nature) => rejection('accessToken', nature, res);
    const atkn = req.cookies.atkn;
    if (!atkn) return rejectAs('missing');
    const decoded = this.utils.verify('atkn', atkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip };
    next();
  }

  validateRefreshToken(req, res, next) {
    const rejectAs = (nature) => rejection('refreshToken', nature, res);
    const rtkn = req.cookies.rtkn;
    if (!rtkn) return rejectAs('missing');
    const decoded = this.utils.verify('rtkn', rtkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip };
    next();
  }
};
