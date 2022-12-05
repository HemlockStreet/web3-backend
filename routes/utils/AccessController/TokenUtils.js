const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const pathTo = (testing) =>
  `${__dirname}/${testing ? 'TestTokens' : 'EncryptionTokens'}.json`;

const LocalData = require('../data/LocalData');
module.exports = class TokenUtils extends LocalData {
  update(log = false) {
    super.egress();
    if (this.opts.testing.TokenUtils && log)
      console.log({ egressed: this.data });
  }

  reset() {
    const access = crypto.randomBytes(64).toString('hex');
    const refresh = crypto.randomBytes(64).toString('hex');
    this.data = { access, refresh };
    super.ingress(this.data);
    if (this.opts.testing.TokenUtils) console.log({ ingressed: this.data });
    this.update(true);
  }

  constructor(opts = { testing: {} }) {
    super(pathTo(opts.testing.TokenUtils));
    this.opts = opts;
    this.update(true);
    if (!this.data.access || !this.data.refresh) this.reset();
  }

  generate(data) {
    const atkn = jwt.sign(data, this.data.access, { expiresIn: '90m' });
    const rtkn = jwt.sign(data, this.data.refresh, { expiresIn: '2400m' });
    const output = { atkn, rtkn };
    if (this.opts.testing.TokenUtils) console.log({ generated: output });
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
