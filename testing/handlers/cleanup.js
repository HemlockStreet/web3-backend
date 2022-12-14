const { existsSync, mkdirSync, copyFileSync, rmSync } = require('fs');

const pathTo = {
  dust: './testing/dust',
  evm: './routes/utils/evm',
  AccessController: './routes/utils/AccessController',
};

if (!existsSync(pathTo.dust))
  mkdirSync(pathTo.dust + '/active', { recursive: true });

module.exports = (address, funded, active) => {
  if (funded)
    copyFileSync(
      `${pathTo.evm}/WalletConfig.json`,
      active
        ? `${pathTo.dust}/active/${address}.json`
        : `${pathTo.dust}/${address}.json`
    );

  [
    'AccessController/EncryptionTokens',
    'AccessController/SessionData',
    'evm/WalletConfig',
    'evm/ChainConfig',
  ].forEach((file) => {
    const pathTo = `./routes/utils/${file}.json`;
    if (existsSync(pathTo)) rmSync(pathTo);
  });

  copyFileSync(
    `${pathTo.evm}/ChainConfigBackup.json`,
    `${pathTo.evm}/ChainConfig.json`
  );
};
