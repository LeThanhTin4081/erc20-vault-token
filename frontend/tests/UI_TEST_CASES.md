# UI test cases - Vault Token Console

## Automated E2E

Run from `frontend/`:

```bash
npm run test:e2e
```

The Playwright suite covers:

| ID | Area | Expected result |
| --- | --- | --- |
| UI-A01 | Home | Hero, tokenomics, supply/cap, and 7-contract content render. |
| UI-A02 | Navigation | Top navigation jumps to Tokenomics and 7 Contracts sections. |
| UI-A03 | Console | Console mode exposes Overview, Staking, Airdrop, Locker, Admin tabs. |
| UI-A04 | Disconnected staking | Stake/Unstake/Claim Points are disabled without wallet; invalid amount cannot enable action. |
| UI-A05 | Disconnected airdrop | Invalid snapshot and zero reward cannot enable Claim Token. |
| UI-A06 | Locker duration | Duration segmented control changes selected state; Lock remains protected without wallet. |
| UI-A07 | Admin gating | Open Trading, Snapshot, Apply, Pause, Unpause are disabled without admin wallet. |
| UI-A08 | Responsive | Same tests run on desktop Chromium and mobile Chromium. |

## Manual wallet + local chain cases

Precondition:

1. In project root: `npm run node`
2. In project root, new terminal: `npm run deploy:local:reset`
3. In project root, new terminal: `npm run setup:local`
4. In `frontend/`: `npm run dev`
5. Open `http://localhost:3000`, connect MetaMask to Hardhat Local `31337`.

| ID | Function | Steps | Expected result |
| --- | --- | --- | --- |
| UI-M01 | Connect wallet | Click Connect Wallet, select MetaMask/local account. | Address appears, network is Hardhat Local, cards load balances. |
| UI-M02 | Wrong network guard | Switch MetaMask to a non-31337 chain, click any enabled action. | Notice shows `Switch MetaMask to local network.` |
| UI-M03 | Stake approve | Go Staking, enter amount above current staking allowance, click Approve Vault. | Wallet asks signature, notice changes to submitted/confirmed, approved amount updates. |
| UI-M04 | Stake VLT | Enter amount within allowance, click Stake VLT. | Staked card increases, wallet balance decreases, pool TVL increases. |
| UI-M05 | Unstake validation | Enter amount larger than staked amount, click Unstake. | Notice shows `Unstake amount is above your stake.` |
| UI-M06 | Unstake success | Enter valid unstake amount, click Unstake. | Staked card decreases, wallet balance increases. |
| UI-M07 | Claim points | Wait until pending reward > 0, click Claim Points. | Pending resets to 0, Points card increases. |
| UI-M08 | Airdrop zero claim | Go Airdrop with snapshot that has 0 reward. | Claim Token remains disabled. |
| UI-M09 | Airdrop success | Admin snapshots/funds/approves distributor, user selects funded snapshot, clicks Claim Token. | Token balance increases by reward, state changes to Claimed. |
| UI-M10 | Double claim | Try to claim the same snapshot again. | Claim Token remains disabled or transaction reverts as already claimed. |
| UI-M11 | Lock approve | Go Locker, enter amount above locker allowance, choose duration, click Approve Locker. | Approval transaction confirms and button changes to Lock VLT. |
| UI-M12 | Lock VLT | Click Lock VLT after approval. | New lock record appears with amount, unlock date, progress bar, Unlock disabled until ready. |
| UI-M13 | Unlock early | Try unlocking before unlock time. | Unlock button is disabled. |
| UI-M14 | Unlock ready | After lock expires, click Unlock. | Token balance increases and lock record shows Released. |
| UI-M15 | Admin open trading | With admin wallet and trading closed, click Open Trading. | Launch status becomes Open; button label changes to Trading Open/disabled. |
| UI-M16 | Admin snapshot | With admin wallet, click Snapshot. | Current Epoch increments. |
| UI-M17 | Admin burn validation | Enter burn rate > 10 and click Apply. | UI/transaction path rejects with `Burn rate must be between 0 and 10.` |
| UI-M18 | Admin set burn | Enter valid burn rate, click Apply. | Burn Rate card updates to the requested percentage. |
| UI-M19 | Admin pause | Click Pause. | Token status becomes Paused; user actions that transfer token become disabled for non-admin. |
| UI-M20 | Admin unpause | Click Unpause. | Token status becomes Active and user actions are available again when other conditions pass. |
