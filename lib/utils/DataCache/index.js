const fs = require('fs');

module.exports = class DataCache {
  egress() {
    if (this.wasAltered()) {
      this.data = JSON.parse(fs.readFileSync(this.pathTo));
      this.accessTime = new Date().getTime();
    }
    return this.data;
  }

  ingress(data) {
    const string = JSON.stringify(data, undefined, 2);
    fs.writeFileSync(this.pathTo, string);
    this.egress();
  }

  wasAltered() {
    const lastModified = fs.statSync(this.pathTo).mtimeMs;
    const verdict = lastModified > this.accessTime;
    return verdict;
  }

  constructor(pathTo, opts = { testing: {} }) {
    this.pathTo = pathTo;
    this.opts = opts;
    this.accessTime = 0;
    if (fs.existsSync(pathTo)) this.egress();
    else this.ingress({});
  }

  keys() {
    const obj = this.egress();
    const strings = Object.keys(obj);
    return strings;
  }
};
