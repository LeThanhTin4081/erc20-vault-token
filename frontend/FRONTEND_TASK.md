# Frontend Task - Vault Token

## Context

- `frontend/` la mot Next.js app rieng trong repo blockchain.
- Web3 stack da co trong `package.json`: `wagmi`, `viem`, `ethers`, `@rainbow-me/rainbowkit`, `@tanstack/react-query`.
- Local chain hien tai: Hardhat `31337`, RPC `http://127.0.0.1:8545`.
- Contract addresses dang lay theo `ignition/deployments/chain-31337/deployed_addresses.json`.

## Da lam

- Tao Wagmi + RainbowKit provider cho MetaMask/injected wallet.
- Tao `src/lib/contracts.ts` gom local chain, contract addresses va ABI toi thieu cho frontend.
- Thay template Next mac dinh bang Vault Token console:
  - Overview: balance, TVL, treasury, supply, launch status.
  - Staking: approve/stake, unstake, claim points.
  - Airdrop: check snapshot reward va claim token.
  - Locker: approve/lock, doc danh sach lock, unlock khi den han.
  - Admin: open trading, snapshot, set burn rate, pause/unpause.
- Sua `scripts/setupAdmin.ts` de `TokenLocker.lock` nhan duration 30 ngay thay vi unix timestamp.
- Sua `AirdropDistributor.rewardPerPoint` ve `1` vi points da luu theo 18 decimals; tranh reward bi phong dai 1e18 lan.
- Lam frontend compact reward lon, chan claim neu reward vuot Treasury, va lam UI Admin khong tran dia chi.
- Dong bo `scripts/setupAdmin.ts` voi tokenomics trong `ke_hoach_token_erc20.md`: 200,000 VLT vao Treasury va 300,000 VLT Team/Dev lock 180 ngay.

## Can luu y

- MetaMask can them/switch sang Hardhat Local chain id `31337`.
- Backend local node phai chay truoc khi frontend doc du lieu contract.
- Neu deploy lai contract, cap nhat addresses trong `src/lib/contracts.ts`.
- `TokenLocker.lock(amount, duration)` nhan `duration` tinh bang giay, khong phai unix timestamp.

## Task tiep theo

- Dong bo dia chi contract tu Ignition JSON tu dong de tranh sua tay.
- Them toast transaction dep hon cho pending/success/fail.
- Tach UI thanh component rieng khi dashboard phinh to.
- Bo sung page admin treasury: deposit, approve distributor, withdraw.
- Them test/component smoke cho cac helper parse va format.
