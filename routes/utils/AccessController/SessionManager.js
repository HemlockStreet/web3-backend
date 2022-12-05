const UserGroup = require('./UserGroup');

module.exports = class SessionManager {
  constructor(opts = { testing: {} }) {
    this.opts = opts;
    const addon = opts.testing.AccessControl ? 'Test' : '';
    this.group = {
      wheel: new UserGroup('Wheel' + addon),
      manager: new UserGroup('Management' + addon),
      employee: new UserGroup('Employee' + addon),
      client: new UserGroup('Client' + addon),
    };
  }

  tier(address) {
    if (
      this.group.wheel.hasMember(address) ||
      this.group.wheel.membersOf().length === 0
    )
      return 7;
    else if (this.group.manager.hasMember(address)) return 5;
    else if (this.group.employee.hasMember(address)) return 3;
    else if (this.group.client.hasMember(address)) return 1;
    else return 0;
  }

  findGroup(user) {
    const currentTier = this.tier(user);
    if (currentTier === 7) return 'wheel';
    else if (currentTier === 5) return 'manager';
    else if (currentTier === 3) return 'employee';
    else if (currentTier === 1) return 'client';
  }

  isAllowed(groupTo, author) {
    const tier = this.tier(author);
    return (
      (['wheel', 'manager'].includes(groupTo) && tier >= 7) ||
      (groupTo === 'employee' && tier >= 5) ||
      groupTo === 'client'
    );
  }

  allowAccess(address, rtkn) {
    const groupTokens = this.group[this.findGroup(address)].data;
    const utkn = groupTokens[address];
    const loggedIn = utkn !== '';
    const isMatch = utkn === rtkn;
    return isMatch && loggedIn;
  }

  promote(user, to, author) {
    if (!this.isAllowed(to, author)) return;
    const from = this.findGroup(user);
    if (!this.isAllowed(from, author)) return;

    this.group[from].remove(user);
    if (this.opts.testing.AccessControl)
      console.log('promoted', user, 'to', to, 'author:', author);
    return this.group[to].add(user);
  }

  demote(user, to, author) {
    const from = this.findGroup(user);
    if (!this.isAllowed(from, author)) return;
    if (!this.isAllowed(to, author)) return;
    this.group[from].remove(user);
    this.group[to].add(user);
    if (this.opts.testing.AccessControl)
      console.log('demoted', user, 'to', to, 'from', from, 'author:', author);
    return true;
  }

  eject(user, from, author) {
    if (!this.isAllowed(from, author)) return;
    this.group[from].remove(user);
    return true;
  }

  logIn(user, token) {
    return this.group[this.findGroup(user)].logIn(user, token);
  }

  logOut(user) {
    return this.group[this.findGroup(user)].logOut(user);
  }

  clearAllSessions() {
    Object.keys(this.group).forEach((name) =>
      this.group[name].clearLogInSessions()
    );
    return true;
  }
};
