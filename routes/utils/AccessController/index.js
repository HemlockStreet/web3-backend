const { rejection } = require('../validation');

const SessionManager = require('./SessionManager');
const TokenUtils = require('./TokenUtils');

module.exports = class AccessController {
  constructor() {
    this.tkn = new TokenUtils();
    this.sessions = new SessionManager();
  }

  // for initial user login
  chValidation(req, res, next) {
    const { message, address } = req.body.user;
    const decoded = this.tkn.verify('atkn', message);
    if (!decoded || decoded.ip !== req.ip || decoded.address !== address)
      return rejection('challenge', 'invalid', res);
    next();
  }

  // for user refresh/logout
  rtknValidation(req, res, next) {
    const rejectAs = (nature) => rejection('rtkn', nature, res);

    // extract token
    const rtkn = req.cookies.rtkn;

    // expect refresh token
    if (!rtkn) return rejectAs('missing');
    // expect refresh token to be stored
    if (!this.sesh.has(rtkn)) return rejectAs('invalid');
    // expect valid token
    const decoded = this.tkn.verify('rtkn', rtkn);
    if (!decoded) rejectAs('invalid');
    // expect ip addresses to match up
    const { address, ip, timestamp } = decoded;
    if (req.ip !== decoded.ip) return rejectAs('stolen');

    // set userData and goto next
    req.userData = { address, ip, timestamp };
    next();
  }

  // for general user access
  atknValidation(req, res, next) {
    const rejectAs = (nature) => rejection('atkn', nature, res);

    // extract token
    const atkn = req.cookies.atkn;

    // expect access token
    if (!atkn) return rejectAs('missing');
    // we did not store this token
    /* no need to check if it's in storage */
    // expect valid token
    const decoded = this.tkn.verify('atkn', atkn);
    if (!decoded) rejectAs('invalid');
    // expect ip addresses to match up
    const { address, ip, timestamp } = decoded;
    if (req.ip !== decoded.ip) return rejectAs('stolen');

    // set userData and goto next
    req.userData = { address, ip, timestamp };
    next();
  }

  // for user access
  tierValidation(required, req, res, next) {
    const { tier } = req.userData;
    if (tier < required) return rejection('tier', '!authorized', res);
    next();
  }

  // GET /login
  issueChallenge(req, res) {
    res.status(200).json({
      challenge: this.tkn.challengeString(req.body.user.address, req.ip),
    });
  }

  // POST/PATCH /login
  login(req, res) {
    const { address, ip, timestamp } = req.userData;
    const { atkn, rtkn } = this.tkn.generate({ address, ip, timestamp });

    // returning users
    if (!this.sessions.logIn(address, rtkn)) {
      // new users
      const defaultGroup =
        this.sessions.group.wheel.membersOf().length === 0 ? 'wheel' : 'client';
      this.sessions.promote(address, defaultGroup, address);
      this.sessions.logIn(address, rtkn);
    }

    const decoded = {
      atkn: this.tkn.decode(atkn),
      rtkn: this.tkn.decode(rtkn),
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

  // GET /user
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

  // PUT /user
  promote(req, res) {
    const rejectAs = (nature) => rejection('promotion', nature, res);

    const { address: user, groupId: to } = req.body.args;
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

  // PATCH /user
  demote(req, res) {
    const rejectAs = (nature) => rejection('demotion', nature, res);

    const { address: user, groupId: to } = req.body.args;
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

  // DELETE /user
  eject(req, res) {
    const rejectAs = (nature) => rejection('ejection', nature, res);

    const { address: user, groupId: from } = req.body.args;
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
