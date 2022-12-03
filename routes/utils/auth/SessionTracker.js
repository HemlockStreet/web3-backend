const fs = require('fs');
const jwt = require('jsonwebtoken');

const pathTo = './routes/utils/auth/Sessions.json';

class SessionTracker {
  save() {
    fs.writeFileSync(pathTo, JSON.stringify({ data: this.all }, undefined, 2));
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
    if (!fs.existsSync(pathTo)) {
      this.all = [];
      this.save();
    } else {
      this.all = JSON.parse(fs.readFileSync(pathTo)).data;
      this.clean();
    }
  }

  constructor() {
    this.reset();
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
