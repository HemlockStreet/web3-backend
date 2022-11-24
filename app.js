const app = require('./utils/setup');
const { address, availableNetworks, provider, signer } = require('./utils/evm');
const { ethers } = require('ethers');

app.get('/', (req, res) =>
  res.status(200).json({
    message: 'Hello World! My Ethereum wallet address is: ' + address(),
    availableNetworks: availableNetworks(),
  })
);

const balance = async (network) => {
  const result = await provider(network).getBalance(address());
  return ethers.utils.formatEther(result);
};

app
  .route('/balance/:network')
  .get(async (req, res) => {
    try {
      const { network } = req.params;
      const value = await balance(network);
      res.status(200).json({
        message: 'My balance is ' + value + ' ethers',
      });
    } catch (e) {
      const error = e.toString();
      res.status(400).json({ error });
    }
  })
  .post(async (req, res) => {
    try {
      const { network } = req.params;
      const { to, amount } = req.body;
      const value = ethers.utils.parseEther(amount);
      const tx = await signer(network).sendTransaction({ to, value });
      await tx.wait();
      res.status(200).json('ok');
    } catch (e) {
      const error = e.toString();
      res.status(400).json({ error });
    }
  });
