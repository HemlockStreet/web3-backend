const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const pathToTokens = './routes/utils/auth/TokenStore.json';

const msg = (info) => {
  return { info };
};

class Auth {
  constructor() {
    this.update();
  }

  reset() {
    if (fs.existsSync(pathToTokens)) fs.rmSync(pathToTokens);
    const access = crypto.randomBytes(64).toString('hex');
    const refresh = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(
      pathToTokens,
      JSON.stringify({ access, refresh }, undefined, 2)
    );
    this.access = access;
    this.refresh = refresh;
  }

  update() {
    if (!fs.existsSync(pathToTokens)) this.reset();
    else {
      const { access, refresh } = require('./TokenStore.json');
      this.access = access;
      this.refresh = refresh;
    }
    this.users = [];
    this.opts = {
      httpOnly: true,
      // secure: true,
      // domain: 'mywebsite.com'
    };
  }

  createAccessToken(address, ip) {
    return jwt.sign({ address, ip }, this.access, {
      expiresIn: '15m',
    });
  }

  createRefreshToken(address, ip) {
    return jwt.sign({ address, ip }, this.refresh);
  }

  tokenize(address, ip) {
    const accessToken = this.createAccessToken(address, ip);
    const refreshToken = this.createRefreshToken(address, ip);
    this.users.push(refreshToken);
    return { accessToken, refreshToken };
  }

  decode(token) {
    return jwt.decode(token);
  }

  validate(req, res, next) {
    const base = '@auth.enticate - ';
    const accessToken = req.cookies.accessToken;
    if (!accessToken) return res.status(401).json(msg(base + '!jwt'));
    if (req.ip !== this.decode(accessToken).ip)
      return res
        .clearCookie('refreshToken')
        .clearCookie('accessToken')
        .status(403)
        .json(msg(base + '!jwt.valid'));

    jwt.verify(accessToken, this.access, (err, user) => {
      if (err) return res.status(403).json(msg(base + '!jwt.valid'));
      req.user = user.address;
      next();
    });
  }

  edit(req, res) {
    const base = '@route.login(PATCH) - ';
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return res.status(401).json(msg(base + '!refreshToken'));
      if (!this.users.includes(refreshToken))
        return res.status(403).json(msg(base + '!jwt.valid'));

      jwt.verify(refreshToken, this.refresh, (err, user) => {
        if (err) return res.status(403).json(msg(base + '!jwt.valid'));

        const accessToken = this.createAccessToken(user, req.ip);

        res
          .cookie('accessToken', accessToken, this.opts)
          .status(200)
          .json(msg('Session Extended'));
      });
    } catch (err) {
      res.status(400).json(msg(base + err.toString()));
    }
  }

  del(req, res) {
    const token = req.body.token;
    this.users = this.users.filter((tkn) => tkn !== token);
    res
      .clearCookie('refreshToken')
      .clearCookie('accessToken')
      .status(204)
      .json(msg('Logged Out'));
  }
}

module.exports = Auth;
