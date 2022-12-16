const { existsSync, mkdirSync, copyFileSync, rmSync } = require('fs');

const pathTo = {
  dust: './testing/dust',
  evm: './lib/utils/evm',
  Auth: './lib/utils/Auth',
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
    'Auth/EncryptionTokens',
    'Auth/SessionData',
    'evm/WalletConfig',
    'evm/ChainConfig',
  ].forEach((file) => {
    const pathTo = `./lib/utils/${file}.json`;
    if (existsSync(pathTo)) rmSync(pathTo);
  });

  copyFileSync(
    `${pathTo.evm}/ChainConfigBackup.json`,
    `${pathTo.evm}/ChainConfig.json`
  );
};
