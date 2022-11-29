const bcrypt = require('bcrypt');

const salt = async (saltRounds) => await bcrypt.genSalt(saltRounds);

const hash = async (input, saltOrRounds) =>
  await bcrypt.hash(input, saltOrRounds);

const rounds = (encrypted) => bcrypt.getRounds(encrypted);

const compare = async (data, encrypted) =>
  await bcrypt.compare(data, encrypted);

module.exports = { salt, hash, compare, rounds };
