function rejection(type, nature, res) {
  const data = { info: `${type} - ${nature}` };
  res.status(400).json(data);
}

module.exports = { rejection };
