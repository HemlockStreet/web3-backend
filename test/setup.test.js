const chai = require('chai');
const expect = chai.expect;

const Evm = require('../routes/utils/evm');
const evm = new Evm();

xdescribe('setup', () => {
  context('sitrep', () => {
    let body;

    it('gets sitrep', async () => {
      const res = await fetch('http://localhost:8080/sitrep', {
        method: 'GET',
      });
      expect(res.status).to.equal(200);
      body = await res.json();
    });

    it('returns the deployer', () => {
      expect(body).to.have.property('deployer').to.equal(evm.wallet.address);
    });

    it('returns stored networks', () => {
      const retrieved = evm.network.publicInfo();
      expect(body).to.have.property('networks');
      expect(retrieved).to.deep.equal(body.networks);
    });
  });
});
