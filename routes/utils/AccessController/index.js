const { rejection } = require('../validation');
const TokenManager = require('./TokenManager');

/**
 * Glossary
 * ctkn === Challenge Token
 * atkn === Access Token
 * rtkn === Refresh Token
 */
module.exports = class AccessController {
  constructor() {
    this.tkn = new TokenManager();
  }

  /**
   * @dev login step 1 (GET /login)
   * Issues challenge token to client. This expires in 5 minutes. Send this request
   * as soon as the user hits "sign in". (REQUIRES USER EVM ADDRESS)
   */
  getChallenge(req, res) {
    const challenge = this.tkn.utils.challengeString(req.ip);
    res.status(200).json({ challenge });
  }

  // POST/PATCH /login
  login(req, res) {
    const { address, ip, timestamp } = req.userData;
    const tokens = this.tkn.utils.generate({ address, ip, timestamp });
    const decoded = this.tkn.logUserIn(address, tokens);

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
      .cookie('atkn', tokens.atkn, cookieOpts)
      .cookie('rtkn', tokens.rtkn, cookieOpts)
      .status(200)
      .json({
        atkn: { iat: decoded.atkn.iat, exp: decoded.atkn.exp },
        rtkn: { iat: decoded.rtkn.iat, exp: decoded.rtkn.exp },
        accessTier: this.tkn.roles.rolesOf(address),
      });
  }

  // PUT /login
  logout(req, res) {
    const { address } = req.userData;
    this.tkn.logUserOut(address);

    const message = {
      info: `logged out`,
      by: address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(204).json(message);
  }

  // EMERGENCY FUNCTION
  logoutAll(req, res) {
    const { address, timestamp } = req.userData;
    this.tkn.clear();

    const message = {
      info: `logged out all users`,
      by: address,
      timestamp,
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
    output.me = req.userData;
    res.status(200).json(output);
  }

  // PUT /user
  promote(req, res) {
    const rejectAs = (nature) => rejection('promotion', nature, res);

    const { address: user, groupId: to } = req.body.args.userConfig;
    const author = req.userData.address;

    if (!this.sessions.promote(user, to, author))
      return rejectAs('!authorized');

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

    const { address: user, groupId: to } = req.body.args.userConfig;
    const author = req.userData.address;

    if (!this.sessions.demote(user, to, author)) return rejectAs('!authorized');

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

    const { address: user } = req.body.args.userConfig;
    const from = this.sessions.findGroup(user);
    const author = req.userData.address;

    if (!this.sessions.eject(user, from, author))
      return rejectAs('!authorized');

    const message = {
      info: `${user} ejected from database`,
      by: author,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }
};
