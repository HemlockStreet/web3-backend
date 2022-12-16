const { existsSync, mkdirSync, copyFileSync, rmSync } = require('fs');

const pathTo = {
  dust: './testing/dust',
  utils: './lib/utils',
};

if (!existsSync(pathTo.dust))
  mkdirSync(pathTo.dust + '/active', { recursive: true });

module.exports = (address, funded, active) => {
  if (funded)
    copyFileSync(
      `${pathTo.utils}/Ethereum/WalletConfig.json`,
      active
        ? `${pathTo.dust}/active/${address}.json`
        : `${pathTo.dust}/${address}.json`
    );

  [
    'Auth/EncryptionTokens',
    'Auth/SessionData',
    'Ethereum/WalletConfig',
    'Ethereum/ChainConfig',
  ].forEach((file) => {
    const currentPath = `${pathTo.utils}/${file}.json`;
    if (existsSync(currentPath)) rmSync(currentPath);
  });

  copyFileSync(
    `${pathTo.utils}/Ethereum/ChainConfigBackup.json`,
    `${pathTo.utils}/Ethereum/ChainConfig.json`
  );
};
