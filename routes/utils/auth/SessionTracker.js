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

  clean() {
    let allDecoded = [];
    this.all.forEach((rtkn) => allDecoded.push(jwt.decode(rtkn)));
    const now = parseInt(new Date().getTime() / 1000);
    allDecoded.forEach((target) => {
      const idx = allDecoded.indexOf(target);
      if (target.exp < now)
        this.all = this.all.filter((entry) => entry !== this.all[idx]);
    });
    this.save();
  }

  reset() {
    this.all = [];
    if (!this.exists()) this.save();
    else {
      this.all = this.extract();

      this.clean();
    }
  }

  constructor() {
    this.reset();
  }

  has(token) {
    return this.all.includes(token);
  }

  add(token) {
    this.reset();
    this.all.push(token);
    this.save();
  }

  rm(token) {
    this.reset();
    this.all = this.all.filter((entry) => entry !== token);
    this.save();
  }
}

module.exports = SessionTracker;
