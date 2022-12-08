const { rejection } = require('../validation');
const SessionManager = require('./SessionManager');
const TokenUtils = require('./TokenUtils');

module.exports = class AccessController {
  constructor() {
    this.utils = new TokenUtils();
    this.sessions = new SessionManager();
  }

  rtknValidation(req, res, next) {
    const rejectAs = (nature) => {
      res.clearCookie('rtkn').clearCookie('atkn');
      return rejection('refreshToken', nature, res);
    };
    const rtkn = req.cookies.rtkn;
    if (!rtkn) return rejectAs('missing');
    const decoded = this.utils.verify('rtkn', rtkn);
    if (decoded?.ip !== req.ip) return rejectAs('invalid');
    const { address, ip, timestamp } = decoded;
    if (!this.sessions.allowAccess(address, rtkn)) return rejectAs('invalid');
    req.userData = {
      address,
      ip,
      timestamp,
      tier: this.sessions.tier(address),
    };
    next();
  }

  atknValidation(req, res, next) {
    const rejectAs = (nature) => {
      res.clearCookie('rtkn').clearCookie('atkn');
      return rejection('access/refresh token', nature, res);
    };
    const atkn = req.cookies.atkn;
    const rtkn = req.cookies.rtkn;
    if ([atkn, rtkn].includes(undefined)) return rejectAs('missing');
    const decoded = this.utils.verify('atkn', atkn);
    if (decoded?.ip !== req.ip) return rejectAs('invalid');
    const { address, ip, timestamp } = decoded;
    if (!this.sessions.allowAccess(address, rtkn)) return rejectAs('invalid');
    req.userData = {
      address,
      ip,
      timestamp,
      tier: this.sessions.tier(address),
    };
    next();
  }

  requireTier(required, req, res, next) {
    const { tier } = req.userData;
    if (tier < required) return rejection('tier', '!authorized', res);
    next();
  }

  chValidation(req, res, next) {
    const { message, address } = req.body.user;
    const decoded = this.utils.verify('atkn', message);
    if (!decoded || decoded.ip !== req.ip || decoded.address !== address)
      return rejection('challenge', 'invalid', res);
    next();
  }

  // GET /login
  issueChallenge(req, res) {
    res.status(200).json({
      challenge: this.utils.challengeString(req.body.user.address, req.ip),
    });
  }

  // POST/PATCH /login
  login(req, res) {
    const { address, ip, timestamp } = req.userData;
    const { atkn, rtkn } = this.utils.generate({ address, ip, timestamp });

    // returning users
    if (!this.sessions.logIn(address, rtkn)) {
      // new users
      const defaultGroup =
        this.sessions.group.wheel.membersOf().length === 0 ? 'wheel' : 'client';
      this.sessions.promote(address, defaultGroup, address);
      this.sessions.logIn(address, rtkn);
    }

    const decoded = {
      atkn: this.utils.decode(atkn),
      rtkn: this.utils.decode(rtkn),
    };

    const cookieOpts = {
      httpOnly: true,
      // secure: true,
      // domain: 'mywebsite.com'
    };

    const message = {
      info: `logged in`,
      by: address,
      timestamp,
    };
    console.log(message);
    res
      .cookie('atkn', atkn, cookieOpts)
      .cookie('rtkn', rtkn, cookieOpts)
      .status(200)
      .json({
        atkn: { iat: decoded.atkn.iat, exp: decoded.atkn.exp },
        rtkn: { iat: decoded.rtkn.iat, exp: decoded.rtkn.exp },
        accessTier: this.sessions.tier(address),
      });
  }

  // PUT /login
  logout(req, res) {
    const { address } = req.userData;
    this.sessions.logOut(address);

    const message = {
      info: `logged out`,
      by: address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(204).json(message);
  }

  // DELETE /login
  logoutAll(req, res) {
    const { address } = req.userData;
    this.sessions.clearAllSessions();

    const message = {
      info: `logged out all users`,
      by: address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(204).json(message);
  }

  // GET /manage/::group
  view(req, res) {
    let output = {};
    const tier = req.userData.tier;
    if (tier > 3) {
      output.wheel = this.sessions.group.wheel.membersOf();
      output.managers = this.sessions.group.manager.membersOf();
      output.employees = this.sessions.group.employee.membersOf();
    }
    if (tier > 1) output.clientele = this.sessions.group.client.membersOf();
    res.status(200).json(output);
  }

  // PUT /manage/::group
  promote(req, res) {
    const rejectAs = (nature) => rejection('promotion', nature, res);

    const to = req.params.group;
    const user = req.body.args.address;
    if ([user, to].includes(undefined)) return rejectAs('invalid input');

    const author = req.userData.address;
    if (!this.sessions.promote(user, to, author))
      return rejection('!authorized');

    const message = {
      info: `${user} promoted to ${to}`,
      by: author,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }

  // PATCH /manage/::group
  demote(req, res) {
    const rejectAs = (nature) => rejection('demotion', nature, res);

    const to = req.params.group;
    const user = req.body.args.address;
    if ([user, to].includes(undefined)) return rejectAs('invalid input');

    const author = req.userData.address;
    if (!this.sessions.demote(user, to, author))
      return rejection('!authorized');

    const message = {
      info: `${user} demoted to ${to}`,
      by: author,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }

  // DELETE /manage/::group
  eject(req, res) {
    const rejectAs = (nature) => rejection('ejection', nature, res);

    const from = req.params.group;
    const user = req.body.args.address;
    if ([user, from].includes(undefined)) return rejectAs('invalid input');

    const author = req.userData.address;
    if (!this.sessions.eject(user, from, author))
      return rejection('!authorized');

    const message = {
      info: `${user} ejected from database`,
      by: author,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }
};
