const ethers = require('ethers');

async function validate(message, signature, address) {
  let msgSigner;
  try {
    msgSigner = await ethers.utils.verifyMessage(message, signature);
  } catch (error) {
    throw new Error('@signatureValidation - bad signature');
  }

  if (address !== msgSigner)
    throw new Error(
      `@signatureValidation - user.address(${address}) !== msgSigner(${msgSigner})`
    );

  return true;
}

module.exports = { validate };
