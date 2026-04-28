import { defineChain, keccak256, parseAbi, stringToBytes } from "viem";
import type { Address } from "viem";

export const hardhatChain = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

export const contractAddresses = {
  accessManager: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  airdropPoints: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  launchToken: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  stakingVault: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  tokenLocker: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  treasury: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  airdropDistributor: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
} as const satisfies Record<string, Address>;

export const roles = {
  admin: keccak256(stringToBytes("ADMIN_ROLE")),
} as const;

export const launchTokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function tradingOpen() view returns (bool)",
  "function burnRate() view returns (uint256)",
  "function paused() view returns (bool)",
  "function openTrading()",
  "function setBurnRate(uint256 _burnRate)",
  "function pause()",
  "function unpause()",
]);

export const stakingVaultAbi = parseAbi([
  "function totalStaked() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
  "function userInfo(address account) view returns (uint256 amount, uint256 rewardDebt, uint256 unclaimedRewards)",
  "function pendingRewards(address account) view returns (uint256)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimRewards()",
  "function emergencyWithdraw()",
]);

export const airdropPointsAbi = parseAbi([
  "function currentSnapshotId() view returns (uint256)",
  "function getCurrentPoints(address user) view returns (uint256)",
  "function getPoints(address user, uint256 snapshotId) view returns (uint256)",
  "function snapshot() returns (uint256)",
]);

export const airdropDistributorAbi = parseAbi([
  "function rewardPerPoint() view returns (uint256)",
  "function claimed(uint256 snapshotId, address user) view returns (bool)",
  "function calculateReward(address user, uint256 snapshotId) view returns (uint256)",
  "function claim(uint256 snapshotId)",
]);

export const tokenLockerAbi = parseAbi([
  "function getLockCount(address user) view returns (uint256)",
  "function getLockInfo(address user, uint256 lockId) view returns (uint256 amount, uint256 unlockTime, bool isReleased)",
  "function lock(uint256 amount, uint256 duration)",
  "function unlock(uint256 lockId)",
]);

export const accessManagerAbi = parseAbi([
  "function hasRole(bytes32 role, address account) view returns (bool)",
]);

export const treasuryAbi = parseAbi([
  "function getBalance() view returns (uint256)",
  "function approveSpender(address spender, uint256 amount)",
  "function withdraw(address to, uint256 amount)",
]);
