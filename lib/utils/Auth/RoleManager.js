const DataCache = require('../DataCache');
module.exports = class RoleManager extends DataCache {
  saveData() {
    super.ingress(this.data);
    super.egress();
  }

  // get user addresses/names
  usersOf() {
    super.egress();
    return super.keys();
  }

  // get scope
  scopeOf(address) {
    super.egress();
    return this.data[address].scope;
  }

  // is there a root user?
  hasRootUser() {
    const addresses = this.usersOf();
    if (addresses.length === 0) return;
    let result;
    addresses.forEach((address) => {
      if (this.scopeOf(address) === 'root') result = true;
    });
    return result;
  }

  constructor() {
    super(`${__dirname}/SessionData.json`);
    super.egress();
    this.isConfigured = this.hasRootUser();
  }

  // enumerate scope
  scopeTier(accessTier) {
    if (accessTier === 'root') return 7;
    else if (accessTier === 'admin') return 5;
    else if (accessTier === 'manager') return 3;
    else if (accessTier === 'employee') return 2;
    else if (accessTier === 'user') return 1;
    else return 0;
  }

  // does this user exist?
  hasUser(address) {
    super.egress();
    return this.usersOf().includes(address);
  }

  // add user to group
  addUser(address) {
    if (this.hasUser(address)) return;
    this.data[address] = {
      scope: this.isConfigured ? 'user' : 'root',
      roles: [],
    };
    this.saveData();
    this.isConfigured = this.hasRootUser();
    return this.data[address];
  }

  // remove user from group
  rmUser(address) {
    if (!this.hasUser(address)) return true;
    delete this.data[address];
    this.saveData();
    return this.data[address] === undefined;
  }

  // get user roles
  rolesOf(address) {
    super.egress();
    return this.data[address].roles;
  }

  // list users of scope
  scopeUsers(scope) {
    super.egress();
    const all = this.usersOf();
    let addresses = [];
    all.forEach((address) => {
      if (scope === this.data[address].scope)
        addresses.push({ [address]: this.rolesOf(address) });
    });
    return addresses;
  }

  // edit scope
  setScope(address, scope) {
    if (!this.hasUser(address) || this.scopeOf(address) === scope) return true;
    if (!['root', 'admin', 'manager', 'employee', 'user'].includes(scope))
      return;
    this.data[address].scope = scope;
    this.saveData();
    return this.data[address].scope === scope;
  }

  // does the user have this role?
  hasRole(address, role) {
    super.egress();
    return this.rolesOf(address).includes(role);
  }

  // add role to user
  addRole(address, role) {
    if (!this.hasUser(address)) return;
    if (this.hasRole(address, role)) return true;
    this.data[address].roles.push(role);
    this.saveData();
    return this.hasRole(address, role);
  }

  // remove role from user
  rmRole(address, role) {
    if (!this.hasUser(address) || !this.hasRole(address, role)) return true;
    this.data[address].roles = this.data[address].roles.filter(
      (userRole) => userRole !== role
    );
    this.saveData();
    return this.hasRole(address, role);
  }
};
