const LocalData = require('../data/LocalData');
module.exports = class RoleManager extends LocalData {
  saveData() {
    super.ingress(this.data);
    super.egress();
  }

  constructor() {
    super(`${__dirname}/SessionData.json`);
    super.egress();
  }

  // get user addresses/names
  usersOf() {
    super.egress();
    return super.keys();
  }

  // get user roles
  rolesOf(address) {
    super.egress();
    return this.data[address].roles;
  }

  // does the user have this role?
  hasRole(address, role) {
    super.egress();
    return this.rolesOf(address).includes(role);
  }

  // is there a root user?
  isConfigured() {
    let result;
    this.usersOf().forEach((address) => {
      if (this.hasRole(address, 'root')) result = true;
    });
    return result;
  }

  // does this user exist?
  hasUser(address) {
    super.egress();
    return this.usersOf().includes(address);
  }

  // add user to group
  addUser(address, roles = ['user']) {
    if (this.hasUser(address)) return;
    this.data[address] = {
      roles: this.isConfigured() ? roles : ['root'],
      token: '',
    };
    this.saveData();
    return this.data[address];
  }

  // remove user from group
  rmUser(address) {
    if (!this.hasUser(address)) return true;
    delete this.data[address];
    this.saveData();
    return this.data[address] === undefined;
  }

  // add role to user
  addRole(address, role) {
    if (!this.hasUser(address) || this.hasRole(address, role)) return true;
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
