const { rejection } = require('../validation');
const Manager = require('./Manager');

/**
 * Glossary
 * ctkn === Challenge Token
 * atkn === Access Token
 * rtkn === Refresh Token
 */
module.exports = class Auth {
  constructor() {
    this.manager = new Manager();
  }

  /**
   * @dev login step 1 (GET /login)
   * Issues challenge token to client. This expires in 5 minutes. Send this request
   * as soon as the user hits "sign in". (REQUIRES USER EVM ADDRESS)
   */
  getChallenge(req, res) {
    const challenge = this.manager.tkn.challengeString(req.ip);
    res.status(200).json({ challenge });
  }

  // POST/PATCH /login
  login(req, res) {
    const { address, ip, timestamp } = req.userData;
    const tokens = this.manager.tkn.generate({ address, ip, timestamp });
    const decoded = this.manager.logUserIn(address, tokens);

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
        scope: this.manager.roles.scopeOf(address),
        roles: this.manager.roles.rolesOf(address),
      });
  }

  // PUT /login
  logout(req, res) {
    const { address } = req.userData;
    this.manager.logUserOut(address);

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
    this.manager.clear();

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
    if (tier >= 7) output.root = this.manager.roles.scopeUsers('root');
    if (tier >= 5) output.admins = this.manager.roles.scopeUsers('admin');
    if (tier >= 3) {
      output.managers = this.manager.roles.scopeUsers('manager');
      output.clientele = this.manager.roles.scopeUsers('user');
      output.employees = this.manager.roles.scopeUsers('employee');
    }
    output.me = req.userData;
    res.status(200).json(output);
  }

  // PUT /user
  editScope(req, res) {
    const rejectAs = (nature) => rejection('scope edit', nature, res);
    const { address, groupId } = req.body.args.userConfig;
    const addressScope = this.manager.roles.scopeOf(address);
    if (
      (req.userData.scope === 'root' && address === req.userData.address) ||
      (req.userData.scope !== 'root' &&
        (req.userData.tier < this.manager.roles.scopeTier(groupId) ||
          req.userData.tier <= this.manager.roles.scopeTier(addressScope)))
    )
      return rejectAs('!authorized');

    if (!this.manager.roles.setScope(address, groupId))
      return rejectAs('invalid scope');

    const message = {
      info: `set ${address} scope to ${groupId}`,
      by: req.userData.address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }

  // PATCH /user
  editRoles(req, res) {
    const rejectAs = (nature) => rejection('role edit', nature, res);

    const { address, tag, add } = req.body.args.userConfig;
    if (typeof tag !== 'string') return rejectAs('invalid role');
    const addressScope = this.manager.roles.scopeOf(address);
    if (
      (req.userData.scope === 'root' && address === req.userData.address) ||
      (req.userData.scope !== 'root' &&
        req.userData.tier <= this.manager.roles.scopeTier(addressScope))
    )
      return rejectAs('!authorized');

    if (add) {
      if (!this.manager.roles.addRole(address, tag))
        return rejectAs('invalid user');
    } else this.manager.roles.rmRole(address, tag);

    const message = {
      info: `${add ? 'granted' : 'revoked'} role: ${tag} to ${address}`,
      by: req.userData.address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }

  // DELETE /user
  eject(req, res) {
    const rejectAs = (nature) => rejection('account deletion', nature, res);

    const { address } = req.body.args.userConfig;
    const addressScope = this.manager.roles.scopeOf(address);

    if (
      address !== req.userData.address &&
      (req.userData.tier <= this.manager.roles.scopeTier(addressScope) ||
        req.userData.tier < 3)
    )
      return rejectAs('!authorized');

    this.manager.roles.rmUser(address);

    const message = {
      info: `${address} ejected from database`,
      by: req.userData.address,
      timestamp: new Date(),
    };
    console.log(message);
    res.status(200).json(message);
  }
};
