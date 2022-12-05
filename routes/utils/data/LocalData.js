const fs = require('fs');

module.exports = class LocalData {
  egress(log = false) {
    if (this.wasAltered(log)) {
      const raw = fs.readFileSync(this.pathTo);
      this.data = JSON.parse(raw);
      this.accessTime = new Date().getTime();
    }

    if (this.opts.testing.LocalData && log)
      console.log({ egressed: this.data });
    return this.data;
  }

  ingress(data) {
    const string = JSON.stringify(data, undefined, 2);
    fs.writeFileSync(this.pathTo, string);

    if (this.opts.testing.LocalData) console.log({ ingressed: data });
    this.egress(true);
  }

  wasAltered(log = false) {
    const lastModified = fs.statSync(this.pathTo).mtimeMs;
    const verdict = lastModified > this.accessTime;

    if (this.opts.testing.LocalData && log) console.log({ altered: verdict });
    return verdict;
  }

  constructor(pathTo, opts = { testing: {} }) {
    this.pathTo = pathTo;
    this.opts = opts;
    this.accessTime = 0;

    if (this.opts.testing.LocalData) console.log({ observing: pathTo });

    if (fs.existsSync(pathTo)) this.egress(true);
    else this.ingress({});
  }

  keys(log = false) {
    const obj = this.egress(log);
    const strings = Object.keys(obj);

    if (this.opts.testing.LocalData) console.log({ keys: strings });
    return strings;
  }
};
