const fs = require('fs');
const jwt = require('jsonwebtoken');

const pathTo = './routes/utils/auth/Sessions.json';

class SessionTracker {
  exists() {
    return fs.existsSync(pathTo);
  }

  save() {
    fs.writeFileSync(pathTo, JSON.stringify({ data: this.all }, undefined, 2));
  }

  extract() {
    return JSON.parse(fs.readFileSync(pathTo)).data;
  }

  constructor() {
    this.all = [];
    if (!this.exists()) this.save();
    else this.all = this.extract();
  }

  has(token) {
    return this.all.includes(token);
  }

  add(token) {
    this.all.push(token);
    this.save();
  }

  rm(token) {
    this.all = this.all.filter((entry) => entry !== token);
    this.save();
  }
}

module.exports = SessionTracker;
