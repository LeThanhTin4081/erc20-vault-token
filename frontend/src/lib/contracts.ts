import { keccak256, parseAbi, stringToBytes } from "viem";
import { sepolia } from "viem/chains";
import type { Address } from "viem";

export const contractAddresses = {
  accessManager: "0xcc1717D9aF0bED1EB82a8A40F4F1B23e04c13995",
  airdropPoints: "0xa6d5924f0A5e505aaCA0a650336c190144989256",
  launchToken: "0x8Ef6924aABCAa859F60F9eB69131D82ecB6E518d",
  stakingVault: "0x6f610989c433faD35087D0F315710E87E587937e",
  tokenLocker: "0x92F0db39b18297892d376B843aACE476d32a04E3",
  treasury: "0xd6d7e7b9fA173C8E89ff3c76CcbEFA16A80CC756",
  airdropDistributor: "0x0Ef3dC869186286d54242A4fABE854536a99eb3a",
} as const satisfies Record<string, Address>;

export const roles = {
  admin: keccak256(stringToBytes("ADMIN_ROLE")),
} as const;

export const sepoliaChain = sepolia;

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
