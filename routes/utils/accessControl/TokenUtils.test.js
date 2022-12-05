const TokenUtils = require('./TokenUtils');

console.log('\nStart Test: TokenUtils');

console.log('\n| First Initialization');
new TokenUtils({
  testing: { TokenUtils: true },
});

console.log('\n| Second Initialization');
const utils = new TokenUtils({
  testing: { TokenUtils: true },
});

console.log('|| Generating Tokens...');
const { atkn, rtkn } = utils.generate({ a: 128, b: '256' });

console.log('|| Decoding Tokens...');
console.log('atkn', utils.decode(atkn));
console.log('rtkn', utils.decode(rtkn));

console.log('|| Verifying Tokens...');
console.log('atkn', utils.verify('atkn', atkn));
console.log('rtkn', utils.verify('rtkn', rtkn));

console.log('\nEnd Test: TokenUtils\n');
require('fs').rmSync(__dirname + '/TestTokens.json');
