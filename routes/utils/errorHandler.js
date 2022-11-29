module.exports = (res, route, method, err) =>
  res
    .status(400)
    .json({ info: `@route.${route}(${method})\n${err.toString()}` });
