const app = require('./lib/app');
const { isDev, port } = require('./config');

if (isDev)
  app.post('/throw', (req, res) => console.nonexistentMethod(req, res));

require('./lib/routes')(app);

app.listen(port, () => console.log(`\nListening On port:${port}\n`));
app.use((req, res, next) => res.status(404).send('404 - Page Not Found.'));
app.use((err, req, res) =>
  res
    .status(err.status || 500)
    .send(res.status + '. An unknown error has occured.')
);

module.exports = app;
