const LocalData = require('../data/LocalData');
module.exports = class UserGroup extends LocalData {
  update(log = false) {
    super.egress();
    if (this.opts.testing.UserGroup && log)
      console.log({ egressed: this.data });
  }

  constructor(NameOf, opts = { testing: {} }) {
    super(`${__dirname}/${NameOf}Group.json`);
    this.opts = opts;
    this.update(true);
  }

  membersOf() {
    return super.keys();
  }

  store() {
    super.ingress(this.data);
    if (this.opts.testing.UserGroup) console.log({ ingressed: this.data });
    this.update();
  }

  hasMember(address) {
    return this.membersOf().includes(address);
  }

  // add user to group
  add(address) {
    if (this.hasMember(address)) return;
    this.data[address] = '';
    this.store();
    return true;
  }

  // remove user from group
  remove(address) {
    if (!this.hasMember(address)) return;
    delete this.data[address];
    this.store();
    return true;
  }

  // user log-in (require address = signer)
  logIn(address, token) {
    if (!this.hasMember(address)) return;
    this.data[address] = token;
    this.store();
    return true;
  }

  // user log-out (require address = signer)
  logOut(address) {
    if (!this.hasMember(address)) return;
    this.data[address] = '';
    this.store();
    return true;
  }

  // logout all users (require tier > 5 only)
  clearLogInSessions() {
    this.membersOf().forEach((member) => {
      this.data[member] = '';
    });
    this.store();
    return true;
  }
};
