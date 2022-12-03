const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const pathToTokens = './routes/utils/auth/Tokens.json';

class TokenUtils {
  reset() {
    if (fs.existsSync(pathToTokens)) fs.rmSync(pathToTokens);
    const access = crypto.randomBytes(64).toString('hex');
    const refresh = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(
      pathToTokens,
      JSON.stringify({ access, refresh }, undefined, 2)
    );
  }

  update() {
    if (!fs.existsSync(pathToTokens)) this.reset();

    const { access, refresh } = require('./Tokens.json');
    this.access = access;
    this.refresh = refresh;
  }

  constructor() {
    this.update();
  }

  generate(data) {
    const atkn = jwt.sign(data, this.access, { expiresIn: '90m' });
    const rtkn = jwt.sign(data, this.refresh, { expiresIn: '2400m' });
    return { atkn, rtkn };
  }

  decode(token) {
    return jwt.decode(token);
  }
}

module.exports = TokenUtils;
