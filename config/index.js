require('dotenv').config();

const isDev = process.env.NODE_ENV === 'dev';

// allowed ports = [49152, 65535]
const testPort = 49152;

const port = isDev ? process.env.PORT : testPort;

module.exports = { isDev, testPort, port };
