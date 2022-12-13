const ethers = require('ethers');
const handle = require('./testing/handlers');
const { ctrl, evm, deployer, wallets, provider } = handle.mocks;

const [newRoot, newAdmin, newManager, newEmployee, newUser] = wallets;
const reference = evm.network.data;
const network = 'polygonMumbai';
const { polygonMumbai } = reference;
const networkDetails = polygonMumbai;

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const rewire = require('rewire');
const request = require('supertest');

var app = rewire('./app');
var sandbox = sinon.createSandbox();

let response, credentials, cookies;
let sessions = [];

// @loginFlow
async function processCredentials(user = deployer, response) {
  const signature = await user.signMessage(response.body.challenge);
  credentials = {
    address: user.address,
    message: response.body.challenge,
    signature,
  };
}

async function logIn(user = deployer) {
  response = await request(app).get('/login');
  await processCredentials(user, response);
  response = await request(app).post('/login').send({ credentials });
  cookies = response.headers['set-cookie'];
}

async function logOut(tokens = cookies) {
  await request(app).delete('/login').set('Cookie', tokens);
}

async function massLogin() {
  for await (const user of wallets) {
    await logIn(user);
    sessions.push(cookies);
  }
  await logIn();
}

async function massLogout() {
  for await (const user of wallets) {
    await logOut(user);
    sessions.push(cookies);
  }
  sessions = [];
}

const expectStatus = (res, num) => {
  if (res.status !== num && res.body) console.error(res.body);
  expect(res.status).to.equal(num);
};

describe('app', () => {
  afterEach(() => {
    sandbox.restore();
    // app = rewire('./app');
  });

  xcontext('404 ERROR', () => {
    it('GET', async () => {
      response = request(app).get('/404').expect(404);
    });
  });

  xcontext('500 ERROR', () => {
    it('GET', async () => {
      response = await request(app).post('/throw').expect(500);
    });
  });

  xcontext('/sitrep', () => {
    it('GET', async () => {
      response = await request(app).get('/sitrep');
      expectStatus(response, 200);

      expect(response.body)
        .to.have.property('deployer')
        .to.equal(evm.wallet.address);

      expect(response.body)
        .to.have.property('networks')
        .to.deep.equal(evm.network.publicInfo());
    });
  });

  xcontext('/login', () => {
    it('GETs login challenge', async () => {
      response = await request(app).get('/login');
      expectStatus(response, 200);
      expect(response.body).to.have.property('challenge');
      const ctkn = response.body.challenge;
      const decoded = ctrl.tkn.utils.verify('atkn', ctkn);
      expect(decoded).to.exist;
      expect(decoded.ip).to.equal('::ffff:127.0.0.1');
      expect(decoded.iat + 5 * 60).to.equal(decoded.exp);

      const signature = await deployer.signMessage(ctkn);
      credentials = {
        address: deployer.address,
        message: ctkn,
        signature,
      };
    });

    it('disallows missing login credentials', async () => {
      response = await request(app).post('/login').send({});
      expectStatus(response, 400);
    });

    function expectProperDates(res) {
      const body = res.body;
      expect(body).to.have.property('scope');
      expect(body).to.have.property('roles').to.deep.equal([]);

      expect(body).to.have.property('atkn');
      expect(body).to.have.property('rtkn');

      const { atkn, rtkn } = body;
      expect(atkn).to.have.property('iat');
      expect(rtkn).to.have.property('iat');

      expect(atkn)
        .to.have.property('exp')
        .to.equal(atkn.iat + 90 * 60);
      expect(rtkn)
        .to.have.property('exp')
        .to.equal(rtkn.iat + 2400 * 60);
    }

    it('disallows missing login credentials', async () => {
      response = await request(app).post('/login').send({});
      expectStatus(response, 400);
    });

    it('disallows missing messages', async () => {
      response = await request(app)
        .post('/login')
        .send({
          credentials: {
            message: undefined,
            signature: credentials.signature,
            address: credentials.address,
          },
        });
      expectStatus(response, 400);
    });

    it('disallows missing signatures', async () => {
      response = await request(app)
        .post('/login')
        .send({
          credentials: {
            message: credentials.message,
            signature: undefined,
            address: credentials.address,
          },
        });
      expectStatus(response, 400);
    });

    it('disallows missing addresses', async () => {
      response = await request(app)
        .post('/login')
        .send({
          credentials: {
            message: credentials.message,
            signature: credentials.signature,
            address: undefined,
          },
        });
      expectStatus(response, 400);
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
          expectProperDates(response);
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
          expectProperDates(response);
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
      expectProperDates(response);
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

  xcontext('/user', async () => {
    beforeEach(async () => await massLogin());
    afterEach(async () => await massLogout());

    function expectUserData(user, res) {
      expect(res.body).to.haveOwnProperty('me');
      const me = res.body.me;
      expect(me).to.haveOwnProperty('timestamp');
      expect(me).to.haveOwnProperty('address').to.equal(user.address);
      expect(me).to.haveOwnProperty('ip').to.equal('::ffff:127.0.0.1');
      expect(me).to.haveOwnProperty('scope');
      expect(me).to.haveOwnProperty('roles');
    }

    function expectScopeMembers(res, scope, entries = []) {
      let expectedEntries = [];
      entries.forEach((entry) => expectedEntries.push({ [entry.address]: [] }));
      expect(res.body).to.haveOwnProperty(scope).to.deep.equal(expectedEntries);
    }

    function expectNoScope(res, scope) {
      expect(res.body).to.not.haveOwnProperty(scope);
    }

    function expectMe(res, scope) {
      const num =
        scope === 'root'
          ? 7
          : scope === 'admin'
          ? 5
          : scope === 'manager'
          ? 3
          : scope === 'employee'
          ? 2
          : 1;
      expect(response.body.me).to.haveOwnProperty('scope').to.equal(scope);
      expect(res.body.me).to.haveOwnProperty('tier').to.equal(num);
    }

    function expectNoRoles(res) {
      expect(res.body.me).to.haveOwnProperty('roles').to.deep.equal([]);
    }

    it('GETs "me" (root)', async () => {
      response = await request(app).get('/user').set('Cookie', cookies);
      expectScopeMembers(response, 'root', [deployer]);
      expectScopeMembers(response, 'admins');
      expectScopeMembers(response, 'managers');
      expectScopeMembers(response, 'employees');
      expectScopeMembers(response, 'clientele', wallets);
      expectUserData(deployer, response);
      expectMe(response, 'root');
      expectNoRoles(response);
    });

    it('GETs "me" (user)', async () => {
      for await (const user of wallets) {
        response = await request(app)
          .get('/user')
          .set('Cookie', sessions[wallets.indexOf(user)]);
        expectStatus(response, 200);
        expectNoScope(response, 'root');
        expectNoScope(response, 'admins');
        expectNoScope(response, 'managers');
        expectNoScope(response, 'employees');
        expectNoScope(response, 'clientele');
        expectUserData(user, response);
        expectMe(response, 'user');
        expectNoRoles(response);
      }
    });

    it('PUTs allow scope editing', async () => {
      const [newRoot, newAdmin, newManager, newEmployee, newUser] = wallets;
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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

      await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newEmployee)])
        .send({
          args: {
            userConfig: {
              address: newUser.address,
              groupId: 'user',
            },
          },
        })
        .expect(400);

      await request(app)
        .put('/user')
        .set('Cookie', sessions[wallets.indexOf(newUser)])
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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);
    });

    it('updates new gets', async () => {
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expectScopeMembers(response, 'root', [deployer, newRoot]);
        expectScopeMembers(response, 'admins', [newAdmin]);
        expectScopeMembers(response, 'managers', [newManager]);
        expectScopeMembers(response, 'employees', [newEmployee]);
        expectScopeMembers(response, 'clientele', [newUser]);
        expectUserData(signerOf, response);
        expectMe(response, 'root');
        expectNoRoles(response);
      }

      response = await request(app).get('/user').set('Cookie', sessions[1]);
      expectNoScope(response, 'root');
      expectScopeMembers(response, 'admins', [newAdmin]);
      expectScopeMembers(response, 'managers', [newManager]);
      expectScopeMembers(response, 'employees', [newEmployee]);
      expectScopeMembers(response, 'clientele', [newUser]);
      expectUserData(newAdmin, response);
      expectMe(response, 'admin');
      expectNoRoles(response);

      response = await request(app).get('/user').set('Cookie', sessions[2]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectScopeMembers(response, 'managers', [newManager]);
      expectScopeMembers(response, 'employees', [newEmployee]);
      expectScopeMembers(response, 'clientele', [newUser]);
      expectUserData(newManager, response);
      expectMe(response, 'manager');
      expectNoRoles(response);

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectNoScope(response, 'managers');
      expectNoScope(response, 'employees');
      expectNoScope(response, 'clientele');
      expectUserData(newEmployee, response);
      expectMe(response, 'employee');
      expectNoRoles(response);

      response = await request(app).get('/user').set('Cookie', sessions[4]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectNoScope(response, 'managers');
      expectNoScope(response, 'employees');
      expectNoScope(response, 'clientele');
      expectUserData(newUser, response);
      expectMe(response, 'user');
      expectNoRoles(response);
    });

    it('PATCHes edit roles', async () => {
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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);
    });

    it('updates new gets', async () => {
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expectScopeMembers(response, 'root', [deployer, newRoot]);
        expect(response.body)
          .to.haveOwnProperty('admins')
          .to.deep.equal([{ [newAdmin.address]: ['finance'] }]);
        expect(response.body)
          .to.haveOwnProperty('managers')
          .to.deep.equal([{ [newManager.address]: ['network'] }]);
        expectScopeMembers(response, 'employees', [newEmployee]);
        expectScopeMembers(response, 'clientele', [newUser]);
        expectUserData(signerOf, response);
        expectMe(response, 'root');
        expectNoRoles(response);
      }

      response = await request(app).get('/user').set('Cookie', sessions[1]);
      expectNoScope(response, 'root');
      expect(response.body)
        .to.haveOwnProperty('admins')
        .to.deep.equal([{ [newAdmin.address]: ['finance'] }]);
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: ['network'] }]);
      expectScopeMembers(response, 'employees', [newEmployee]);
      expectScopeMembers(response, 'clientele', [newUser]);
      expectUserData(newAdmin, response);
      expectMe(response, 'admin');
      expect(response.body.me)
        .to.haveOwnProperty('roles')
        .to.deep.equal(['finance']);

      response = await request(app).get('/user').set('Cookie', sessions[2]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expect(response.body)
        .to.haveOwnProperty('managers')
        .to.deep.equal([{ [newManager.address]: ['network'] }]);
      expectScopeMembers(response, 'employees', [newEmployee]);
      expectScopeMembers(response, 'clientele', [newUser]);
      expectUserData(newManager, response);
      expectMe(response, 'manager');
      expect(response.body.me)
        .to.haveOwnProperty('roles')
        .to.deep.equal(['network']);

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectNoScope(response, 'managers');
      expectNoScope(response, 'employees');
      expectNoScope(response, 'clientele');
      expectUserData(newEmployee, response);
      expectMe(response, 'employee');
      expectNoRoles(response);

      response = await request(app).get('/user').set('Cookie', sessions[4]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectNoScope(response, 'managers');
      expectNoScope(response, 'employees');
      expectNoScope(response, 'clientele');
      expectUserData(newUser, response);
      expectMe(response, 'user');
      expectNoRoles(response);
    });

    it('DELETEs remove users entirely', async () => {
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
        });
      expectStatus(response, 200);
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
        });
      expectStatus(response, 200);
      expect(ctrl.tkn.roles.data[newManager.address]).to.not.exist;

      response = await request(app)
        .delete('/user')
        .set('Cookie', sessions[3])
        .send({
          args: {
            userConfig: {
              address: newUser.address,
            },
          },
        })
        .expect(400);
    });

    it('updates new gets', async () => {
      const [newRoot, newAdmin, newManager, newEmployee, user] = wallets;
      for await (const signerOf of [deployer, newRoot]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', signerOf === deployer ? cookies : sessions[0]);
        expectScopeMembers(response, 'root', [deployer, newRoot]);
        expectScopeMembers(response, 'admins');
        expectScopeMembers(response, 'managers');
        expectScopeMembers(response, 'employees', [newEmployee]);
        expectScopeMembers(response, 'clientele', [
          newUser,
          newAdmin,
          newManager,
        ]);
        expectUserData(signerOf, response);
        expectMe(response, 'root');
        expectNoRoles(response);
      }

      response = await request(app).get('/user').set('Cookie', sessions[3]);
      expectNoScope(response, 'root');
      expectNoScope(response, 'admins');
      expectNoScope(response, 'managers');
      expectNoScope(response, 'employees');
      expectNoScope(response, 'clientele');
      expectUserData(newEmployee, response);
      expectMe(response, 'employee');
      expectNoRoles(response);

      for await (const signerOf of [user, newAdmin, newManager]) {
        response = await request(app)
          .get('/user')
          .set('Cookie', sessions[wallets.indexOf(signerOf)]);
        expectNoScope(response, 'root');
        expectNoScope(response, 'admins');
        expectNoScope(response, 'managers');
        expectNoScope(response, 'employees');
        expectNoScope(response, 'clientele');
        expectUserData(signerOf, response);
        expectMe(response, 'user');
        expectNoRoles(response);
      }
    });

    it('resets', async () => {
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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);

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
        });
      expectStatus(response, 200);
    });
  });

  xcontext('/network', async () => {
    let rootSesh, adminSesh, managerSesh, empSesh, userSesh, edited;
    beforeEach(async () => {
      await massLogin();
      [rootSesh, adminSesh, managerSesh, empSesh, userSesh] = sessions;
      edited = reference;
    });
    afterEach(async () => await massLogout());

    it('GETs network details', async () => {
      for await (const sesh of [userSesh, adminSesh, empSesh]) {
        await request(app).get('/network').set('Cookie', sesh).expect(400);
      }
      delete edited.polygonMumbai.alias;
      for await (const sesh of [cookies, rootSesh, managerSesh]) {
        response = await request(app).get('/network').set('Cookie', sesh);
        expectStatus(response, 200);
        expect(response.body).to.deep.equal(edited);
      }
    });

    it('DELETEs remove networks', async () => {
      response = await request(app)
        .delete('/network')
        .set('Cookie', sessions[2])
        .send({ network });
      expectStatus(response, 200);

      response = await request(app)
        .delete('/network')
        .set('Cookie', sessions[2])
        .send({ network });
      expectStatus(response, 500);

      response = await request(app).get('/network').set('Cookie', sessions[2]);
      expectStatus(response, 200);

      delete edited.polygonMumbai;
      expect(response.body).to.deep.equal(edited);
    });

    it('PUTs allow network edits', async () => {
      response = await request(app)
        .put('/network')
        .set('Cookie', sessions[2])
        .send({ args: { networkDetails } });
      expectStatus(response, 400);

      response = await request(app)
        .put('/network')
        .set('Cookie', sessions[2])
        .send({
          network,
          args: { networkDetails },
        });
      expectStatus(response, 200);

      response = await request(app).get('/network').set('Cookie', sessions[2]);
      expectStatus(response, 200);

      edited.polygonMumbai = polygonMumbai;
      edited.polygonMumbai.privateRpc = polygonMumbai.rpc;
      expect(response.body).to.deep.equal(edited);
    });
  });

  context('/balance', async () => {
    let rootSesh, adminSesh, managerSesh, empSesh, userSesh, estimate, tx;
    beforeEach(async () => {
      await massLogin();
      [rootSesh, adminSesh, managerSesh, empSesh, userSesh] = sessions;
    });
    afterEach(async () => await massLogout());

    xit('GETs deployer balance', async () => {
      for await (const sesh of [userSesh, managerSesh, empSesh]) {
        await request(app)
          .get('/balance')
          .set('Cookie', sesh)
          .send({ network })
          .expect(400);
      }
      for await (const sesh of [cookies, rootSesh, adminSesh]) {
        response = await request(app)
          .get('/balance')
          .set('Cookie', sesh)
          .send({ network });
        expectStatus(response, 200);
        expect(response.body)
          .to.haveOwnProperty('info')
          .to.equal('My balance is 0.0 Mumbai MATIC.');
      }
    });

    it('PATCHes allow GAS withdrawals', async () => {
      const balance = await provider.getBalance(deployer.address);
      const balanceInt = parseInt(balance.toString());
      console.log('funding GAS');
      const value = '0.1';
      const intValue = parseInt(parseFloat(value) * 10 ** 18);

      tx = deployer.sendTransaction({
        to: evm.wallet.address,
        value: ethers.utils.parseEther(value),
      });

      const feeData = await deployer.getFeeData(tx);
      let gasPrice;
      if (feeData.maxFeePerGas)
        gasPrice = parseInt(feeData.maxFeePerGas.toString());
      else gasPrice = parseInt((await provider.getGasPrice()).toString());

      estimate = gasPrice * 21000 + intValue;
      expect(balanceInt).to.be.greaterThan(estimate);
      await (await tx).wait();

      response = await request(app)
        .get('/balance')
        .set('Cookie', cookies)
        .send({ network });
      expectStatus(response, 200);

      const currency = evm.network.info(network).nativeCurrency.name;
      expect(response.body).to.deep.equal({
        info: `My balance is ${value} ${currency}.`,
      });

      console.log('withdrawing GAS');
      await request(app)
        .patch('/balance')
        .set('Cookie', cookies)
        .send({
          network,
          asset: { to: deployer.address, value: '0.01', type: 'gas' },
        });
      expectStatus(response, 200);
      response = await request(app)
        .get('/balance')
        .set('Cookie', cookies)
        .send({ network });
      expectStatus(response, 200);
      expect(response.body)
        .to.haveOwnProperty('info')
        .to.not.equal(`My balance is ${value} ${currency}.`);
    });

    it('PATCHes allow ERC20 withdrawals', async () => {
      console.log('funding ERC20');
      const token = new ethers.Contract(
        '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        require(`./routes/utils/evm/interfaces/ERC20.json`).abi,
        deployer
      );
      const decimals = await token.decimals();
      const amount = parseInt(
        parseFloat('0.0000001') * 10 ** decimals
      ).toString();
      const tx = await token.transferFrom(
        deployer.address,
        evm.wallet.address,
        amount
      );
      await tx.wait();

      console.log('withdrawing ERC20');
      await request(app)
        .patch('/balance')
        .set('Cookie', cookies)
        .send({
          network,
          asset: {
            to: deployer.address,
            value: '0.0000001',
            type: 'ERC20',
            contractAddress: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
          },
        });
    });

    it('PATCHes allow ERC721 withdrawals', async () => {
      console.log('funding ERC721');
      const token = new ethers.Contract(
        '0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b',
        require(`./routes/utils/evm/interfaces/ERC721.json`).abi,
        deployer
      );
      const tx = await token.transferFrom(
        deployer.address,
        evm.wallet.address,
        704240
      );
      await tx.wait();

      console.log('withdrawing ERC721');
      await request(app)
        .patch('/balance')
        .set('Cookie', cookies)
        .send({
          network,
          asset: {
            to: deployer.address,
            value: '704240',
            type: 'ERC721',
            contractAddress: '0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b',
          },
        });
      expectStatus(response, 200);
    });

    xit('PATCHes allow ERC1155 withdrawals', async () => {});
  });

  context('cleanup', () => {
    it('cleans up after itself', () => handle.cleanup(evm.wallet.address));
  });
});
