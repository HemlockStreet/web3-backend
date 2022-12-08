const ethers = require('ethers');
const TokenUtils = require('./TokenUtils');
const SessionTracker = require('./SessionTracker');
const { rejection } = require('../validation');

class Auth {
  update() {
    this.tkn = new TokenUtils();
    this.sesh = new SessionTracker();
  }

  constructor() {
    this.update();
  }

  // for user login only
  sigValidation(req, res, next) {
    const rejectAs = (nature) => rejection('signature', nature, res);

    // expect login arguments
    const user = req.body.user;
    if (!user) rejectAs('missing');
    // expect valid signature
    let signer;
    try {
      signer = ethers.utils.verifyMessage(user.message, user.signature);
    } catch {
      return rejectAs('invalid');
    }
    // expect address match
    if (user.address !== signer) return rejectAs('stolen');

    // set SOME userData and goto next
    req.userData = { address: user.address, ip: req.ip };
    next();
  }

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

  handleLogin(req, res) {
    let timestamp;
    const { address, ip } = req.userData;

    // get a timestamp
    if (!req.userData.timestamp) timestamp = new Date();
    else {
      this.sesh.rm(req.cookies.rtkn);
      timestamp = req.userData.timestamp;
    }

    // refresh the session or log the user into a new session
    const { atkn, rtkn } = this.tkn.generate({ address, ip, timestamp });
    this.sesh.add(rtkn);

    // let us know the user logged in and let the user know when their session expires
    console.log(`${address} logged in from ${ip} at ${new Date()}`);
    const { iat, exp } = this.tkn.decode(atkn);
    const cookieOpts = {
      httpOnly: true,
      // secure: true,
      // domain: 'mywebsite.com'
    };
    res
      .cookie('atkn', atkn, cookieOpts)
      .cookie('rtkn', rtkn, cookieOpts)
      .status(200)
      .json({ iat, exp });
  }

  handleLogout(req, res) {
    const { rtkn } = req.cookies;
    if (!this.sesh.all.includes(rtkn))
      return res
        .status(403)
        .json({ info: 'validation.refreshToken - invalid' });

    // remove rtkn from storage
    this.sesh.rm(rtkn);

    // clean up the rest while we're at it
    this.sesh.clean();

    // let us and the user know
    console.log(`${req.userData.address} logged out at ${new Date()}`);
    res
      .clearCookie('rtkn')
      .clearCookie('atkn')
      .status(204)
      .json({ info: 'logged out' });
  }

  // for user access
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
}

module.exports = Auth;
