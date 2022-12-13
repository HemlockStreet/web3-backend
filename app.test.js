const fs = require('fs');
const toDelete = [
  'AccessController/EncryptionTokens',
  'AccessController/SessionData',
  'evm/WalletConfig',
];
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
const walletAddresses = wallets.map((wallet) => wallet.address);

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

  context('500 ERROR', () => {
    it('GET', (done) => {
      request(app)
        .post('/throw')
        .expect(500)
        .end((err) => {
          done(err);
        });
    });
  });

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
      expect(response.body).to.have.property('scope');
      expect(response.body).to.have.property('roles').to.deep.equal([]);

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
          baseExpectations(response);
          expect(response.body.scope).to.equal('root');
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
          baseExpectations(response);
          expect(response.body.scope).to.equal('root');
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
      baseExpectations(response);
      expect(response.body.scope).to.equal('user');
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
      for await (const user of wallets) {
        await logIn(user);
        sessions.push(cookies);
      }
      await logIn();
    });

    afterEach(async () => {
      for await (const user of wallets) {
        await logOut(user);
        sessions.push(cookies);
      }
      sessions = [];
    });

    function baseExpectations(user, response) {
      expect(response.body).to.haveOwnProperty('me');
      expect(response.body.me).to.haveOwnProperty('timestamp');
      expect(response.body.me)
        .to.haveOwnProperty('address')
        .to.equal(user.address);
      expect(response.body.me)
        .to.haveOwnProperty('ip')
        .to.equal('::ffff:127.0.0.1');
      expect(response.body.me).to.haveOwnProperty('scope');
      expect(response.body.me).to.haveOwnProperty('roles');
    }

    it('GETs "me"', async () => {
      let response = await request(app).get('/user').set('Cookie', cookies);
      const base = walletAddresses.map((addr) => {
        return { [addr]: [] };
      });
      expect(response.body)
        .to.haveOwnProperty('root')
        .to.deep.equal([{ [deployer.address]: [] }]);
      expect(response.body).to.haveOwnProperty('admins').to.deep.equal([]);
      expect(response.body).to.haveOwnProperty('managers').to.deep.equal([]);
      expect(response.body).to.haveOwnProperty('employees').to.deep.equal([]);
      expect(response.body).to.haveOwnProperty('clientele').to.deep.equal(base);
      baseExpectations(deployer, response);

      expect(response.body.me).to.haveOwnProperty('tier').to.equal(7);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('root');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      for await (user of wallets) {
        response = await request(app)
          .get('/user')
          .set('Cookie', sessions[wallets.indexOf(user)])
          .expect(200);

        expect(response.body).to.not.haveOwnProperty('root');
        expect(response.body).to.not.haveOwnProperty('admins');
        expect(response.body).to.not.haveOwnProperty('managers');
        expect(response.body).to.not.haveOwnProperty('employees');
        expect(response.body).to.not.haveOwnProperty('clientele');
        baseExpectations(user, response);

        expect(response.body.me).to.haveOwnProperty('tier').to.equal(1);
        expect(response.body.me).to.haveOwnProperty('scope').to.equal('user');
        expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
      }
    });

    it('PUTs allow scope editing', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      response = await request(app)
        .put('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newRoot.address,
              groupId: 'rot',
            },
          },
        })
        .expect(400);

      response = await request(app)
        .put('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newRoot.address,
              groupId: 'root',
            },
          },
        })
        .expect(200);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newRoot)])
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
              groupId: 'admin',
            },
          },
        })
        .expect(200);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newAdmin)])
        .send({
          args: {
            userConfig: {
              address: newManager.address,
              groupId: 'manager',
            },
          },
        })
        .expect(200);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newManager)])
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              groupId: 'employee',
            },
          },
        })
        .expect(200);

      await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newEmployee)])
        .send({
          args: {
            userConfig: {
              address: user.address,
              groupId: 'user',
            },
          },
        })
        .expect(400);

      await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(user)])
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              groupId: 'user',
            },
          },
        })
        .expect(400);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newAdmin)])
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
              groupId: 'root',
            },
          },
        })
        .expect(400);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newAdmin)])
        .send({
          args: {
            userConfig: {
              address: deployer.address,
              groupId: 'user',
            },
          },
        })
        .expect(400);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newAdmin)])
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              groupId: 'user',
            },
          },
        })
        .expect(200);

      response = await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newAdmin)])
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              groupId: 'employee',
            },
          },
        })
        .expect(200);
    });

    it('updates new gets', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expect(response.body)
          .to.haveOwnProperty('root')
          .to.deep.equal([
            { [deployer.address]: [] },
            { [newRoot.address]: [] },
          ]);
        expect(response.body)
          .to.haveOwnProperty('admins')
          .to.deep.equal([{ [newAdmin.address]: [] }]);
        expect(response.body)
          .to.haveOwnProperty('managers')
          .to.deep.equal([{ [newManager.address]: [] }]);
        expect(response.body)
          .to.haveOwnProperty('employees')
          .to.deep.equal([{ [newEmployee.address]: [] }]);
        expect(response.body)
          .to.haveOwnProperty('clientele')
          .to.deep.equal([{ [user.address]: [] }]);
        baseExpectations(signerOf, response);
        expect(response.body.me).to.haveOwnProperty('tier').to.equal(7);
        expect(response.body.me).to.haveOwnProperty('scope').to.equal('root');
        expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
      }

      response = await request(app).get('/user').set('Cookie', sessions[1]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body)
        .to.haveOwnProperty('admins')
        .to.deep.equal([{ [newAdmin.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('employees')
        .to.deep.equal([{ [newEmployee.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('clientele')
        .to.deep.equal([{ [user.address]: [] }]);
      baseExpectations(newAdmin, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(5);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('admin');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      response = await request(app).get('/user').set('Cookie', sessions[2]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('employees')
        .to.deep.equal([{ [newEmployee.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('clientele')
        .to.deep.equal([{ [user.address]: [] }]);
      baseExpectations(newManager, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(3);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('manager');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body).to.not.haveOwnProperty('managers');
      expect(response.body).to.not.haveOwnProperty('employees');
      expect(response.body).to.not.haveOwnProperty('clientele');
      baseExpectations(newEmployee, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(2);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('employee');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      response = await request(app).get('/user').set('Cookie', sessions[4]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body).to.not.haveOwnProperty('managers');
      expect(response.body).to.not.haveOwnProperty('employees');
      expect(response.body).to.not.haveOwnProperty('clientele');
      baseExpectations(user, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(1);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('user');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
    });

    it('PATCHes edit roles', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      response = await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              tag: 'finance',
              add: true,
            },
          },
        })
        .expect(200);

      response = await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newEmployee.address,
              tag: 'finance',
              add: false,
            },
          },
        })
        .expect(200);

      response = await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
              tag: 'finance',
              add: true,
            },
          },
        })
        .expect(200);

      response = await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newManager.address,
              tag: 'network',
              add: true,
            },
          },
        })
        .expect(200);
    });

    it('updates new gets', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expect(response.body)
          .to.haveOwnProperty('root')
          .to.deep.equal([
            { [deployer.address]: [] },
            { [newRoot.address]: [] },
          ]);
        expect(response.body)
          .to.haveOwnProperty('admins')
          .to.deep.equal([{ [newAdmin.address]: ['finance'] }]);
        expect(response.body)
          .to.haveOwnProperty('managers')
          .to.deep.equal([{ [newManager.address]: ['network'] }]);
        expect(response.body)
          .to.haveOwnProperty('employees')
          .to.deep.equal([{ [newEmployee.address]: [] }]);
        expect(response.body)
          .to.haveOwnProperty('clientele')
          .to.deep.equal([{ [user.address]: [] }]);
        baseExpectations(signerOf, response);
        expect(response.body.me).to.haveOwnProperty('tier').to.equal(7);
        expect(response.body.me).to.haveOwnProperty('scope').to.equal('root');
        expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
      }

      response = await request(app).get('/user').set('Cookie', sessions[1]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body)
        .to.haveOwnProperty('admins')
        .to.deep.equal([{ [newAdmin.address]: ['finance'] }]);
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: ['network'] }]);
      expect(response.body)
        .to.haveOwnProperty('employees')
        .to.deep.equal([{ [newEmployee.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('clientele')
        .to.deep.equal([{ [user.address]: [] }]);
      baseExpectations(newAdmin, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(5);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('admin');
      expect(response.body.me)
        .to.haveOwnProperty('roles')
        .to.deep.equal(['finance']);

      response = await request(app).get('/user').set('Cookie', sessions[2]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: ['network'] }]);
      expect(response.body)
        .to.haveOwnProperty('employees')
        .to.deep.equal([{ [newEmployee.address]: [] }]);
      expect(response.body)
        .to.haveOwnProperty('clientele')
        .to.deep.equal([{ [user.address]: [] }]);
      baseExpectations(newManager, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(3);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('manager');
      expect(response.body.me)
        .to.haveOwnProperty('roles')
        .to.deep.equal(['network']);

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body).to.not.haveOwnProperty('managers');
      expect(response.body).to.not.haveOwnProperty('employees');
      expect(response.body).to.not.haveOwnProperty('clientele');
      baseExpectations(newEmployee, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(2);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('employee');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      response = await request(app).get('/user').set('Cookie', sessions[4]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body).to.not.haveOwnProperty('managers');
      expect(response.body).to.not.haveOwnProperty('employees');
      expect(response.body).to.not.haveOwnProperty('clientele');
      baseExpectations(user, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(1);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('user');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
    });

    it('DELETEs remove users entirely', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;

      response = await request(app)
        .delete('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newRoot.address,
            },
          },
        })
        .expect(400);

      response = await request(app)
        .delete('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
            },
          },
        })
        .expect(200);
      expect(ctrl.tkn.roles.data[newAdmin.address]).to.not.exist;

      response = await request(app)
        .delete('/user')
        .set('Cookie', sessions[2])
        .send({
          args: {
            userConfig: {
              address: newManager.address,
            },
          },
        })
        .expect(200);
      expect(ctrl.tkn.roles.data[newManager.address]).to.not.exist;

      response = await request(app)
        .delete('/user')
        .set('Cookie', sessions[3])
        .send({
          args: {
            userConfig: {
              address: user.address,
            },
          },
        })
        .expect(400);
    });

    it('updates new gets', async () => {
      let response;
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expect(response.body)
          .to.haveOwnProperty('root')
          .to.deep.equal([
            { [deployer.address]: [] },
            { [newRoot.address]: [] },
          ]);
        expect(response.body).to.haveOwnProperty('admins').to.deep.equal([]);
        expect(response.body).to.haveOwnProperty('managers').to.deep.equal([]);
        expect(response.body)
          .to.haveOwnProperty('employees')
          .to.deep.equal([{ [newEmployee.address]: [] }]);
        expect(response.body)
          .to.haveOwnProperty('clientele')
          .to.deep.equal([
            { [user.address]: [] },
            { [newAdmin.address]: [] },
            { [newManager.address]: [] },
          ]);
        baseExpectations(signerOf, response);
        expect(response.body.me).to.haveOwnProperty('tier').to.equal(7);
        expect(response.body.me).to.haveOwnProperty('scope').to.equal('root');
        expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
      }

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expect(response.body).to.not.haveOwnProperty('root');
      expect(response.body).to.not.haveOwnProperty('admins');
      expect(response.body).to.not.haveOwnProperty('managers');
      expect(response.body).to.not.haveOwnProperty('employees');
      expect(response.body).to.not.haveOwnProperty('clientele');
      baseExpectations(newEmployee, response);
      expect(response.body.me).to.haveOwnProperty('tier').to.equal(2);
      expect(response.body.me).to.haveOwnProperty('scope').to.equal('employee');
      expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);

      for await (const signerOf of [user, newAdmin, newManager]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', sessions[wallets.indexOf(signerOf)]);
        expect(response.body).to.not.haveOwnProperty('root');
        expect(response.body).to.not.haveOwnProperty('admins');
        expect(response.body).to.not.haveOwnProperty('managers');
        expect(response.body).to.not.haveOwnProperty('employees');
        expect(response.body).to.not.haveOwnProperty('clientele');
        baseExpectations(signerOf, response);
        expect(response.body.me).to.haveOwnProperty('tier').to.equal(1);
        expect(response.body.me).to.haveOwnProperty('scope').to.equal('user');
        expect(response.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
      }
    });

    it('resets', async () => {
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      await request(app)
        .put('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
              groupId: 'admin',
            },
          },
        })
        .expect(200);

      await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newAdmin.address,
              tag: 'finance',
              add: true,
            },
          },
        })
        .expect(200);

      await request(app)
        .put('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newManager.address,
              groupId: 'manager',
            },
          },
        })
        .expect(200);

      await request(app)
        .patch('/user')
        .set('Cookie', cookies)
        .send({
          args: {
            userConfig: {
              address: newManager.address,
              tag: 'network',
              add: true,
            },
          },
        })
        .expect(200);
    });
  });

  context('/network', async () => {
    let sessions = [];

    beforeEach(async () => {
      for await (const user of wallets) {
        await logIn(user);
        sessions.push(cookies);
      }
      await logIn();
    });

    afterEach(async () => {
      for await (const user of wallets) {
        await logOut(user);
        sessions.push(cookies);
      }
      sessions = [];
    });

    it('GETs network details', async () => {
      const [rootSesh, adminSesh, managerSesh, empSesh, userSesh] = sessions;
      for await (const sesh of [userSesh, adminSesh, empSesh]) {
        await request(app).get('/network').set('Cookie', sesh).expect(400);
      }
      let response;
      for await (const sesh of [cookies, rootSesh, managerSesh]) {
        response = await request(app)
          .get('/network')
          .set('Cookie', sesh)
          .expect(200);
        expect(response.body).to.deep.equal(evm.network.data);
      }
    });

    const backup = evm.network.data;
    const networkDetails = evm.network.mainnet;
    it('DELETEs remove networks', async () => {
      let response;
      response = await request(app)
        .delete('/network')
        .set('Cookie', sessions[2])
        .send({ network: 'mainet' })
        .expect(500);

      response = await request(app)
        .delete('/network')
        .set('Cookie', sessions[2])
        .send({ network: 'mainnet' })
        .expect(200);

      response = await request(app)
        .delete('/network')
        .set('Cookie', sessions[2])
        .send({ network: 'mainnet' })
        .expect(500);

      response = await request(app)
        .get('/network')
        .set('Cookie', sessions[2])
        .expect(200);

      let edited = backup;
      delete edited.mainnet;
      expect(response.body).to.deep.equal(edited);
    });

    it('PUTs allow network edits', async () => {
      let response;

      response = await request(app)
        .put('/network')
        .set('Cookie', sessions[2])
        .send({ args: { networkDetails } })
        .expect(400);

      response = await request(app)
        .put('/network')
        .set('Cookie', sessions[2])
        .send({ network: 'mainnet', args: { networkDetails } })
        .expect(200);

      response = await request(app)
        .get('/network')
        .set('Cookie', sessions[2])
        .expect(200);
      expect(response.body).to.deep.equal(backup);
    });
  });

  xcontext('/balance', async () => {
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

    it('GETs deployer balance', async () => {});

    it('PATCHes allow withdrawals', async () => {});
  });

  context('cleanup', () => {
    it('cleans up after itself', () => {
      toDelete.forEach((file) => {
        const pathTo = `./routes/utils/${file}.json`;
        if (fs.existsSync(pathTo)) fs.rmSync(pathTo);
      });
    });
  });
});
