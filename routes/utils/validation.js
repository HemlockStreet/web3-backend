function rejection(type, nature, res) {
  const data = { info: `validation.${type} - ${nature}` };

  let status;
  if (
    ['stolen', 'invalid', 'duplicate', '!authorized', 'expired'].includes(
      nature
    )
  )
    status = 403;
  if (['missing', 'incomplete/ missing', 'invalid input'].includes(nature))
    status = 401;

  res.status(status).json(data);
}

module.exports = { rejection };
