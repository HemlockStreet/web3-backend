require('dotenv').config();
const port = process.env.PORT ? process.env.PORT : 8080;
const express = require('express');
const bodyParser = require('body-parser');

const server = express();
server.use(bodyParser.json());
server.listen(port, () => console.log(`Listening On port:${port}\n`));

module.exports = server;
