const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const pathTo = `${__dirname}/EncryptionTokens.json`;

const LocalData = require('../data/LocalData');
module.exports = class TokenUtils extends LocalData {
  update() {
    super.egress();
  }

  randomString() {
    return crypto.randomBytes(64).toString('hex');
  }

  reset() {
    const access = this.randomString();
    const refresh = this.randomString();
    this.data = { access, refresh };
    super.ingress(this.data);
    this.update();
  }

  constructor() {
    super(pathTo);
    this.update();
    if (!this.data.access || !this.data.refresh) this.reset();
  }

  challengeString(ip) {
    const contents = this.randomString();
    return jwt.sign({ contents, ip }, this.data.access, {
      expiresIn: '5m',
    });
  }

  generate(data) {
    const atkn = jwt.sign(data, this.data.access, { expiresIn: '90m' });
    const rtkn = jwt.sign(data, this.data.refresh, { expiresIn: '2400m' });
    const output = { atkn, rtkn };
    return output;
  }

  decode(token) {
    return jwt.decode(token);
  }

  verify(type, token) {
    const secret = type === 'atkn' ? this.data.access : this.data.refresh;
    try {
      return jwt.verify(token, secret);
    } catch {
      return;
    }
  }
};
