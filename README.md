# VaultToken Hardhat Workspace

This repository is a shared Hardhat 3 project for building and testing `VaultToken` and related contracts.

## 1) Quick start

```bash
npm install
npm run compile
npm test
```

## 2) Environment file

This team keeps `.env` shared in the repo.

Required variables:

```env
SEPOLIA_RPC_URL=...
SEPOLIA_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

Optional variables for interaction scripts:

```env
VAULT_TOKEN_ADDRESS=0x...
TRANSFER_TO=0x...
TRANSFER_AMOUNT=1
```

You can copy from `.env.example` as a template.

## 3) Available scripts

- `npm run clean` -> clean Hardhat cache/artifacts
- `npm run compile` -> compile contracts
- `npm test` -> run all tests
- `npm run node` -> start local Hardhat node
- `npm run deploy:local` -> deploy `VaultToken` to local simulated network (`hardhatMainnet`)
- `npm run deploy:sepolia` -> deploy `VaultToken` to Sepolia
- `npm run check:sepolia` -> print signer address + Sepolia ETH balance from current env key

## 4) Useful manual commands

```bash
npx hardhat test test/VaultToken.test.ts
npx hardhat run scripts/interact-read.ts --network sepolia --no-compile
npx hardhat run scripts/interact-write.ts --network sepolia --no-compile
```

## 5) Team workflow

1. Pull latest code.
2. Run `npm install`.
3. Run `npm run compile` and `npm test`.
4. Build features in your assigned files.

## 6) Security note

Even for testnet: never reuse this private key on mainnet or real-value wallets.
