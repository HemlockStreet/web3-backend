const fs = require('fs');
const LocalData = require('./LocalData');

const pathTo = __dirname + '/TestData.json';

let currentKeys, oldKeys;

console.log('\nStart Test: LocalData');

console.log('\n| First Initialization');
const old = new LocalData(pathTo, {
  testing: { LocalData: true },
});
console.log('|| Showing Keys...');
oldKeys = old.keys();

console.log('\n| Second Initialization');
const cache = new LocalData(pathTo, {
  testing: { LocalData: true },
});
console.log('|| Showing Keys...');
currentKeys = cache.keys();
oldKeys = currentKeys;

console.log('\n|| Ingressing...');
cache.ingress({ a: '0', b: '3', c: ['a', 'b', 'c'] });
console.log('|| Showing Keys...');
currentKeys = cache.keys();
oldKeys = currentKeys;

console.log('\n|| Egressing...');
cache.egress(true);
console.log('|| Showing Keys...');
cache.keys();

console.log('\n|| Ingressing...');
cache.ingress({ a: '3', b: 0, c: ['1', '2', '3'] });
console.log('|| Showing Keys...');
cache.keys();
oldKeys = currentKeys;

console.log('\n|| Egressing...');
cache.egress(true);
console.log('|| Showing Keys...');
cache.keys();

console.log('\nEnd Test: LocalData\n');
fs.rmSync(pathTo);
