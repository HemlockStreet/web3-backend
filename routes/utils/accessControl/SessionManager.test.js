const fs = require('fs');
const SessionManager = require('./SessionManager');
const TokenUtils = require('./TokenUtils');

const utils = new TokenUtils({
  testing: { TokenUtils: true },
});

const myToken = utils.generate({ address: 'me', ip: 'something' });
const yourToken = utils.generate({ address: 'you', ip: 'something' });
const theirToken = utils.generate({ address: 'her', ip: 'something' });
const herToken = utils.generate({ address: 'them', ip: 'something' });

console.log('\nStart Test: SessionManager');

console.log('\n| First Initialization');
const controller = new SessionManager({
  testing: { AccessControl: true },
});
controller.promote('me', 'wheel', 'me');
controller.promote('you', 'manager', 'me');
controller.promote('them', 'employee', 'you');
controller.promote('her', 'client', 'her');
controller.logIn('me', myToken.rtkn);
controller.logIn('you', yourToken.rtkn);
controller.logIn('them', theirToken.rtkn);
controller.logIn('her', herToken.rtkn);
controller.promote('her', 'employee', 'you');
controller.demote('her', 'employee', 'client', 'me');
controller.logIn('her', myToken.rtkn);
controller.logOut('me');

controller.clearAllSessions();

console.log('\nEnd Test: SessionManager\n');
fs.rmSync(__dirname + '/WheelTestGroup.json');
fs.rmSync(__dirname + '/ManagementTestGroup.json');
fs.rmSync(__dirname + '/EmployeeTestGroup.json');
fs.rmSync(__dirname + '/ClientTestGroup.json');
fs.rmSync(__dirname + '/TestTokens.json');
