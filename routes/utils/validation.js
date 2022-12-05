const fs = require('fs');
const jwt = require('jsonwebtoken');
const ethers = require('ethers');

function rejection(type, nature, res) {
  const data = { info: `validation.${type} - ${nature}` };

  let status;
  if (['stolen', 'invalid', 'duplicate'].includes(nature)) status = 403;
  if (['missing', 'incomplete/ missing'].includes(nature)) status = 401;

  res.status(status).json(data);
}

const { access, refresh } = require('./auth/Tokens.json');

function accessToken(req, res, next) {
  const reject = (nature) => rejection('accessToken', nature, res);

  const atkn = req.cookies.atkn;
  if (!atkn) return reject('missing');

  const decoded = jwt.decode(atkn);
  if (req.ip !== decoded.ip) return reject('stolen');

  jwt.verify(atkn, access, (err, userData) => {
    if (err) return reject('invalid');
    req.userData = userData;
    next();
  });
}

const pathToSessions = './routes/utils/auth/Sessions.json';
function refreshToken(req, res, next) {
  const reject = (nature) => rejection('refreshToken', nature, res);
  const rtkn = req.cookies.rtkn;
  if (!rtkn) return reject('missing');

  const decoded = jwt.decode(rtkn);
  if (req.ip !== decoded.ip) return reject('stolen');

  if (fs.existsSync(pathToSessions)) {
    const sessions = JSON.parse(fs.readFileSync(pathToSessions)).data;
    if (!sessions.includes(rtkn)) return reject('invalid');
  }

  jwt.verify(rtkn, refresh, (err, data) => {
    if (err) return reject('invalid');
    const userData = { address: data.address, ip: data.ip };
    req.userData = userData;
    next();
  });
}

function signature(req, res, next) {
  const reject = (nature) => rejection('signature', nature, res);

  if (req.cookies.rtkn) return reject('duplicate');

  try {
    const { message, signature, address } = req.body.user;
    try {
      const signer = ethers.utils.verifyMessage(message, signature);
      if (address !== signer) return reject('stolen');

      const { ip } = req;
      req.userData = { address, ip };

      next();
    } catch {
      return reject('invalid');
    }
  } catch {
    return reject('incomplete/ missing');
  }
}

module.exports = { accessToken, refreshToken, signature, rejection };
