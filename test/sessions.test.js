const chai = require('chai');
const expect = chai.expect;

const Evm = require('../routes/utils/evm');
const AccessController = require('../routes/utils/AccessController');
const ethers = require('ethers');

const evm = new Evm();
const ctrl = new AccessController();

describe('sessions', () => {
  const signer = evm.network.signer('polygonMumbai', evm.wallet.key);
  let ctkn, atkn, rtkn;

  context('login', () => {
    it('gets login challenge', async () => {
      const res = await fetch('http://localhost:8080/login', {
        method: 'GET',
      });
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body).to.have.property('challenge');
      ctkn = body.challenge;
    });

    let decoded;
    it('issues a valid token with proper credentials', () => {
      decoded = ctrl.tkn.utils.verify('atkn', ctkn);
      expect(decoded).to.exist;
      expect(decoded.ip).to.equal('::1');
    });

    it('issues a token with 5 minutes to expiry', () => {
      expect(decoded.iat + 5 * 60).to.equal(decoded.exp);
    });

    let loginResponse;
    it('allows the user to sign in with a valid signature', async () => {
      const credentials = {
        address: signer.address,
        message: ctkn,
        signature: await signer.signMessage(ctkn),
      };

      const res = await fetch('http://localhost:8080/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials }),
      });
      let cookies;
      res.headers.forEach((header) => {
        if (header.includes('atkn=')) cookies = header;
      });
      cookies = cookies.split(',');
      atkn = cookies[0].split('=')[1].split(';')[0];
      rtkn = cookies[1].split('=')[1].split(';')[0];
      loginResponse = await res.json();

      expect(res.status).to.equal(200);
    });

    it('gives the first user root access', () => {
      expect(['root']).to.deep.equal(loginResponse.accessTier);
    });

    it('issues tokens with appropriate expiry', () => {
      const access = loginResponse.atkn;
      const refresh = loginResponse.rtkn;
      expect(access.iat + 90 * 60).to.equal(access.exp);
      expect(refresh.iat + 2400 * 60).to.equal(refresh.exp);
    });

    it('allows users to refresh sessions', async () => {
      const res = await fetch('http://localhost:8080/login', {
        method: 'PATCH',
        headers: {
          'Set-Cookie': `atkn=${atkn}`,
          'Set-Cookie': `rtkn=${rtkn}`,
        },
      });

      let cookies;
      res.headers.forEach((header) => {
        if (header.includes('atkn=')) cookies = header;
      });

      loginResponse = await res.json();
      console.log(loginResponse);

      cookies = cookies.split(',');
      const newAtkn = cookies[0].split('=')[1].split(';')[0];
      const newRtkn = cookies[1].split('=')[1].split(';')[0];
      expect(atkn).to.not.equal(newAtkn);
      expect(rtkn).to.not.equal(newRtkn);

      const access = loginResponse.atkn;
      const refresh = loginResponse.rtkn;
      expect(access.iat + 90 * 60).to.equal(access.exp);
      expect(refresh.iat + 2400 * 60).to.equal(refresh.exp);

      expect(res.status).to.equal(200);
    });
  });
});
