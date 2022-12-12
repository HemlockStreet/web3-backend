const { expect } = require('chai');
const assert = require('assert');

describe('file to test', () => {
  context('function to test', () => {
    before(() => {
      console.log('before');
    });
    after(() => {
      console.log('after');
    });
    it('should do something', () => {
      assert.equal(1, 1);
    });
  });

  context('chai test', () => {
    before(() => {
      console.log('before');
    });
    after(() => {
      console.log('after');
    });
    it('should do something', () => {
      expect(1).to.equal(1);
    });
    it('should do another', () => {
      expect({ name: 'foo' }).to.haveOwnProperty('name').to.equal('foo');
      expect(5 > 8).to.be.false;
      expect({}).to.be.a('object');
      expect('foo').to.be.a('string');
      expect(3).to.be.a('number');
      expect('bar').to.be.a('string').lengthOf(3);
      expect([1, 2, 3].length).to.equal(3);
      expect(null).to.be.null;
      expect(undefined).to.not.exist;
      expect(1).to.exist;
    });
  });
});
