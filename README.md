# Ethers x Express Boilerplate for On-Chain Automation

This is a boilerplate for quickly creating a web3-enabled api and frontend that dynamically supports whatever EVM network the backend is configured for. This `BackendFrontend` is purely for administrative use and separate from any potential consumer frontend. The server itself acts as a transaction signer (called the `fiduciary`) and executes orders on behalf of the owner.

> If you need contract automation and would prefer to do it on a locally hosted & trusted server, this is the repository for you.

## Video

tbd

## Features

- Imprints on the first wallet to interact with it and complete the setup process
- allows the owner to withdraw native tokens, ERC20, & ERC721 tokens from the fiduciary wallet
- recognizes the owner via address, message, & signature validation
- allows the owner to set custom RPC URLs for the server to use
- allows the owner to configure various block scanner keys for a planned automated contract deployment and verification feature

## API Keys

Please check `./utils/evm/ChainConfig` for the appropriate block scanner websites.
