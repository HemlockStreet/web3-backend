const bcrypt = require('bcrypt');

class Encryption {
  constructor(rounds) {
    this.rounds = rounds;
  }

  async salt() {
    return await bcrypt.genSalt(this.rounds);
  }

  async hash(input, customSalt) {
    const saltOrRounds = customSalt ? customSalt : this.rounds;
    return await bcrypt.hash(input, saltOrRounds);
  }

  async compare(data, encrypted) {
    return await bcrypt.compare(data, encrypted);
  }

  getRounds(encrypted) {
    return bcrypt.getRounds(encrypted);
  }
}

module.exports = Encryption;
