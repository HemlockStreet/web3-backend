require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const route = require('./routes/index');

const port = process.env.PORT ? process.env.PORT : 8080;
const app = express()
  .use(cors({ origin: '*' }))
  .use(
    bodyParser.urlencoded({
      extended: true,
    })
  )
  .use(bodyParser.json())
  .use(cookieParser());

route(app);

app.listen(port, () => console.log(`\nListening On port:${port}\n`));

app.use((req, res, next) => {
  return res.status(404).send('404 - Page Not Found.');
});

app.use((err, req, res) => {
  res.status = err.status || 500;
  return res.send(res.status + '. An unknown error has occured.');
});

module.exports = app;
