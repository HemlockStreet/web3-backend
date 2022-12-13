const fs = require('fs');
const toDelete = [
  'AccessController/EncryptionTokens',
  'AccessController/SessionData',
];
toDelete.forEach((file) => {
  const pathTo = `./routes/utils/${file}.json`;
  if (fs.existsSync(pathTo)) {
    fs.copyFileSync(pathTo, `./routes/utils/${file}Backup.json`);
    fs.rmSync(pathTo);
  }
});

const ethers = require('ethers');
function createWallet() {
  const newWallet = ethers.Wallet.createRandom();
  return newWallet._signingKey();
}
if (!fs.existsSync('./privateWallet.json'))
  fs.writeFileSync(
    './privateWallet.json',
    JSON.stringify(createWallet(), undefined, 2)
  );
if (!fs.existsSync('./testWallets.json')) {
  let data = [
    createWallet(),
    createWallet(),
    createWallet(),
    createWallet(),
    createWallet(),
  ];
  fs.writeFileSync(
    './testWallets.json',
    JSON.stringify({ data }, undefined, 2)
  );
}
const deployer = new ethers.Wallet(require('./privateWallet.json').privateKey);
const wallets = require('./testWallets.json').data.map(
  (walletData) => new ethers.Wallet(walletData.privateKey)
);

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const rewire = require('rewire');
const request = require('supertest');

const Evm = require('./routes/utils/evm');
const evm = new Evm();
const AccessController = require('./routes/utils/AccessController');
const ctrl = new AccessController();

var app = rewire('./app');
var sandbox = sinon.createSandbox();

describe('app', () => {
  let credentials, cookies;

  afterEach(() => {
    sandbox.restore();
    // app = rewire('./app');
  });

  context('404 ERROR', () => {
    it('GET', (done) => {
      request(app)
        .get('/404')
        .expect(404)
        .end((err) => {
          done(err);
        });
    });
  });

  // context('500 ERROR', () => {
  //   it('GET', (done) => {
  //     request(app)
  //       .post('/throw')
  //       .expect(500)
  //       .end((err) => {
  //         done(err);
  //       });
  //   });
  // });

  context('/sitrep', () => {
    it('GET', (done) => {
      request(app)
        .get('/sitrep')
        .expect(200)
        .end((err, response) => {
          if (err) {
            console.log(err);
            return done(err);
          }

          expect(response.body)
            .to.have.property('deployer')
            .to.equal(evm.wallet.address);

          expect(response.body)
            .to.have.property('networks')
            .to.deep.equal(evm.network.publicInfo());

          done();
        });
    });
  });

  async function processCredentials(user = deployer, response) {
    const signature = await user.signMessage(response.body.challenge);
    credentials = {
      address: user.address,
      message: response.body.challenge,
      signature,
    };
  }

  // BASE LOGIN FLOW
  async function logIn(user = deployer) {
    let response = await request(app).get('/login');
    await processCredentials(user, response);
    response = await request(app).post('/login').send({ credentials });
    cookies = response.headers['set-cookie'];
  }

  async function logOut(tokens = cookies) {
    await request(app).delete('/login').set('Cookie', tokens);
  }

  context('/login', () => {
    it('GETs login challenge', (done) => {
      request(app)
        .get('/login')
        .expect(200)
        .end((err, response) => {
          if (err) {
            console.log(err);
            return done(err);
          }

          expect(response.body).to.have.property('challenge');
          const ctkn = response.body.challenge;

          const decoded = ctrl.tkn.utils.verify('atkn', ctkn);
          expect(decoded).to.exist;
          expect(decoded.ip).to.equal('::ffff:127.0.0.1');
          expect(decoded.iat + 5 * 60).to.equal(decoded.exp);

          deployer.signMessage(ctkn).then((signature) => {
            credentials = {
              address: deployer.address,
              message: ctkn,
              signature,
            };

            done();
          });
        });
    });

    it('disallows missing login credentials', (done) => {
      request(app)
        .post('/login')
        .send({})
        .expect(400)
        .end((err) => {
          done(err);
        });
    });

    function baseExpectations(response) {
      expect(response.body).to.have.property('accessTier');

      expect(response.body).to.have.property('atkn');
      expect(response.body).to.have.property('rtkn');

      expect(response.body.atkn).to.have.property('iat');
      expect(response.body.rtkn).to.have.property('iat');

      expect(response.body.atkn)
        .to.have.property('exp')
        .to.equal(response.body.atkn.iat + 90 * 60);
      expect(response.body.rtkn)
        .to.have.property('exp')
        .to.equal(response.body.rtkn.iat + 2400 * 60);
    }

    it('disallows missing login credentials', (done) => {
      request(app)
        .post('/login')
        .send({})
        .expect(400)
        .end((err) => done(err));
    });

    it('disallows missing messages', (done) => {
      request(app)
        .post('/login')
        .send({
          credentials: {
            message: undefined,
            signature: credentials.signature,
            address: credentials.address,
          },
        })
        .expect(400)
        .end((err) => done(err));
    });

    it('disallows missing signatures', (done) => {
      request(app)
        .post('/login')
        .send({
          credentials: {
            message: credentials.message,
            signature: undefined,
            address: credentials.address,
          },
        })
        .expect(400)
        .end((err) => done(err));
    });

    it('disallows missing addresses', (done) => {
      request(app)
        .post('/login')
        .send({
          credentials: {
            message: credentials.message,
            signature: credentials.signature,
            address: undefined,
          },
        })
        .expect(400)
        .end((err) => done(err));
    });

    it('POSTs for sign in', (done) => {
      request(app)
        .post('/login')
        .send({ credentials })
        .expect(200)
        .end((err, response) => {
          if (err) {
            console.log(err);
            return done(err);
          }
          cookies = response.headers['set-cookie'];
          expect(response.body.accessTier).to.deep.equal(['root']);
          baseExpectations(response);
          done();
        });
    });

    it('PATCHes for token refresh', (done) => {
      request(app)
        .patch('/login')
        .set('Cookie', cookies)
        .expect(200)
        .end((err, response) => {
          if (err) {
            console.log(err);
            return done(err);
          }
          let newCookies = response.headers['set-cookie'];
          expect(cookies[0]).to.not.equal(newCookies[0]);
          expect(cookies[1]).to.not.equal(newCookies[1]);
          cookies = newCookies;
          expect(response.body.accessTier).to.deep.equal(['root']);
          baseExpectations(response);
          done();
        });
    });

    it('DELETEs for logout', (done) => {
      request(app)
        .delete('/login')
        .set('Cookie', cookies)
        .expect(204)
        .end((err) => done(err));
    });

    it('defaults access tier to client for new users', async () => {
      await logIn(wallets[0]);
      const response = await request(app)
        .patch('/login')
        .set('Cookie', cookies)
        .send({ credentials });
      expect(response.body.accessTier).to.deep.equal(['user']);
      baseExpectations(response);
    });

    it('PUTs for mass logout', async () => {
      await logIn();
      await request(app).put('/login').set('Cookie', cookies).expect(204);
      expect(ctrl.tkn.data).to.deep.equal({});
    });

    it('gates mass logout requests', async () => {
      await logIn(wallets[0]);
      await request(app).put('/login').set('Cookie', cookies).expect(400);
    });
  });

  context('/user', async () => {
    let sessions = [];

    beforeEach(async () => {
      for await (user of wallets) {
        await logIn(user);
        sessions.push(cookies);
      }
      await logIn();
    });

    afterEach(async () => {
      for await (user of wallets) {
        await logOut(user);
        sessions.push(cookies);
      }
      sessions = [];
    });

    it('GETs tiered user data', async () => {});

    it('PUTs allow promotion', async () => {});

    it('PATCHes allow demotion', async () => {});

    it('DELETEs remove users', async () => {});
  });
});

toDelete.forEach((file) => {
  const copy = `./routes/utils/${file}Backup.json`;
  if (fs.existsSync(copy)) {
    const current = `./routes/utils/${file}.json`;
    fs.rmSync(current);
    fs.copyFileSync(copy, current);
    fs.rmSync(copy);
  }
});
