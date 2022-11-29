const { signatureValidation } = require('./utils/evm');
const encrypted = require('./utils/auth/encryption');
const handleError = require('./error');
const rte = 'auth';

module.exports = (app) => {
  app
    .route('/auth')
    .get((req, res) => res.send(req.cookies))
    .post(async (req, res) => {
      const mtd = 'POST';
      try {
        const { user } = req.body;
        const { address, signature, message } = user;
        await signatureValidation(message, signature, address);

        const now = new Date();
        const plain = address + signature + message + now;
        const hash = await encrypted.hash(plain, 16);
        res.cookie('auth', hash, { httpOnly: true });

        const data = { info: 'Cookie Established!' };
        res.status(200).json(data);
      } catch (err) {
        handleError(res, rte, mtd, err);
      }
    });
};

encrypted.hash('plain', 8).then((data) => {
  console.log(data);
  console.log(encrypted.rounds(data));
});
