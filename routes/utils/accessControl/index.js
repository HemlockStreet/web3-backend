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

  logIn(address, ip) {
    // new token
    const tokens = this.utils.generate({ address, ip });

    // returning users
    if (this.sessions.logIn(address, tokens.rtkn)) return tokens;

    // new users
    this.promote(address, 'client', address);
    this.sessions.logIn(address, tokens.rtkn);
    return tokens;
  }

  logOut(address) {
    return this.sessions.logOut(address);
  }

  logOutAll() {
    return this.sessions.clearAllSessions();
  }

  handleLogin(req, res) {
    const { address, ip } = req.userData;
    const { atkn, rtkn } = this.logIn(address, ip);
    const decoded = {
      atkn: this.utils.decode(atkn),
      rtkn: this.utils.decode(rtkn),
    };
    const cookieOpts = {
      httpOnly: true,
      // secure: true,
      // domain: 'mywebsite.com'
    };
    res
      .cookie('atkn', atkn, cookieOpts)
      .cookie('rtkn', rtkn, cookieOpts)
      .status(200)
      .json({
        atkn: { iat: decoded.atkn.iat, exp: decoded.atkn.exp },
        rtkn: { iat: decoded.rtkn.iat, exp: decoded.rtkn.exp },
        userTier: this.tier(address),
      });
  }

  validateRefreshToken(req, res, next) {
    const rejectAs = (nature) => {
      res.clearCookie('rtkn').clearCookie('atkn');
      return rejection('refreshToken', nature, res);
    };
    const rtkn = req.cookies.rtkn;
    if (!rtkn) return rejectAs('missing');
    const decoded = this.utils.verify('rtkn', rtkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip, tier: this.tier(address) };
    next();
  }

  handleMetadata(req, res) {
    res.status(200).json(req.userData);
  }

  validateAccessToken(req, res, next) {
    const rejectAs = (nature) => {
      res.clearCookie('rtkn').clearCookie('atkn');
      return rejection('refreshToken', nature, res);
    };
    const atkn = req.cookies.atkn;
    if (!atkn) return rejectAs('missing');
    const decoded = this.utils.verify('atkn', atkn);
    if (!decoded || decoded.ip !== ip) return rejectAs('invalid');
    const { address, ip } = decoded;
    req.userData = { address, ip, tier: this.tier(address) };
    next();
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

  handleLogOutAll(req, res) {
    const rejectAs = (nature) => {
      return rejection('refreshToken', nature, res);
    };
    res.clearCookie('rtkn').clearCookie('atkn');
    if (req.userData.tier < 5) return rejectAs('!authorized');
    this.logOutAll();
    res.status(204).json({ info: 'logged out all users' });
  }
};
