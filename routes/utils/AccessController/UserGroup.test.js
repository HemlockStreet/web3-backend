const fs = require('fs');
const TokenUtils = require('./TokenUtils');
const UserGroup = require('./UserGroup');

const utils = new TokenUtils({
  testing: { TokenUtils: true },
});

const myToken = utils.generate({ address: 'me', ip: 'something' });
const yourToken = utils.generate({ address: 'you', ip: 'something' });
const theirToken = utils.generate({ address: 'her', ip: 'something' });
const herToken = utils.generate({ address: 'them', ip: 'something' });

console.log('\nStart Test: UserGroup');

console.log('\n| First Initialization');
const group = new UserGroup('Test', {
  testing: { UserGroup: true },
});

console.log('\n| Storing Data...');
group.add('me');
group.add('you');
group.add('her');
group.add('them');
group.logIn('me', myToken.rtkn);
group.logIn('you', yourToken.rtkn);
group.logIn('them', theirToken.rtkn);
group.logIn('her', herToken.rtkn);
group.logOut('her');
group.remove('them');
group.remove('her');

console.log('\n| Second Initialization');
new UserGroup('Test', {
  testing: { UserGroup: true },
});

console.log('\n| Clearing Sessions');
group.clearLogInSessions();

console.log('\n| Third Initialization');
new UserGroup('Test', {
  testing: { UserGroup: true },
});

console.log('\nEnd Test: UserGroup\n');
fs.rmSync(__dirname + '/TestGroup.json');
fs.rmSync(__dirname + '/TestTokens.json');
