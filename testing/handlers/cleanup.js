const {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  rmSync,
} = require('fs');

const toDelete = [
  'AccessController/EncryptionTokens',
  'AccessController/SessionData',
  'evm/WalletConfig',
  'evm/ChainConfig',
];

module.exports = () => {
  if (!existsSync('./dust')) mkdirSync('./dust');
  copyFileSync(
    './routes/utils/evm/WalletConfig.json',
    `./dust/${readdirSync('./dust').length}.json`
  );
  toDelete.forEach((file) => {
    const pathTo = `./routes/utils/${file}.json`;
    if (existsSync(pathTo)) rmSync(pathTo);
    copyFileSync(
      './routes/utils/evm/ChainConfigBackup.json',
      './routes/utils/evm/ChainConfig.json'
    );
  });
};
