require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const route = require('./routes/index');

const app = express()
  .use(cors({ origin: '*' }))
  .use(bodyParser.json())
  .use(cookieParser());

if (process.argv[2] !== 'dev') {
  app.use(express.static('./client/build'));
  app.get('/', (req, res) => res.sendFile('./client/build/index.html'));
}

route(app);

const port = process.env.PORT ? process.env.PORT : 8080;
app.listen(port, () => console.log(`\nListening On port:${port}\n`));
