import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

const POINTS_RECORDER_ABI = [
  "event PointsAdded(address indexed user, uint256 points)",
];

function buildPointsRecorderRuntimeBytecode(ethers: any): string {
  const eventTopic = ethers.id("PointsAdded(address,uint256)").slice(2);

  return [
    "0x",
    "60",
    "24",
    "35",
    "60",
    "00",
    "52",
    "60",
    "04",
    "35",
    "7f",
    eventTopic,
    "60",
    "20",
    "60",
    "00",
    "a2",
    "60",
    "00",
    "60",
    "00",
    "f3",
  ].join("");
}

describe("StakingVault", function () {
  let ethers: any;
  let networkHelpers: any;
  let admin: any;
  let user1: any;
  let token: any;
  let vault: any;
  let airdropPoints: any;
  let pointsRecorderInterface: any;
  let initialUserBalance: bigint;

  async function expectRevert(promise: Promise<any>, expectedError: string) {
    try {
      await promise;
      assert.fail(`Expected transaction to revert with: ${expectedError}`);
    } catch (error: any) {
      assert.match(error.message, new RegExp(expectedError.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }

  async function stakeAsUser(amount: bigint) {
    await token.connect(user1).approve(await vault.getAddress(), amount);
    await vault.connect(user1).stake(amount);
  }

  beforeEach(async function () {
    const connection = await hre.network.connect();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;

    [admin, user1] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MockLaunchToken");
    token = await TokenFactory.deploy();

    const AirdropPointsFactory = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await AirdropPointsFactory.deploy();

    await networkHelpers.setCode(
      await airdropPoints.getAddress(),
      buildPointsRecorderRuntimeBytecode(ethers)
    );

    pointsRecorderInterface = new ethers.Interface(POINTS_RECORDER_ABI);

    const VaultFactory = await ethers.getContractFactory("StakingVault");
    vault = await VaultFactory.deploy(
      await token.getAddress(),
      await airdropPoints.getAddress()
    );

    initialUserBalance = ethers.parseEther("1000");
    await token.transfer(user1.address, initialUserBalance);
  });

  describe("Deploy", function () {
    it("1. Deploy StakingVault thành công", async function () {
      assert.strictEqual(await vault.stakingToken(), await token.getAddress());
      assert.strictEqual(await vault.airdropPoints(), await airdropPoints.getAddress());
      assert.strictEqual(await vault.totalStaked(), 0n);
    });
  });

  describe("Stake", function () {
    it("2. User approve token rồi stake thành công", async function () {
      const amount = ethers.parseEther("100");
      const userBalanceBefore = await token.balanceOf(user1.address);

      await token.connect(user1).approve(await vault.getAddress(), amount);
      await vault.connect(user1).stake(amount);

      const userBalanceAfter = await token.balanceOf(user1.address);
      const userInfo = await vault.userInfo(user1.address);

      assert.strictEqual(userBalanceBefore - userBalanceAfter, amount);
      assert.strictEqual(await token.balanceOf(await vault.getAddress()), amount);
      assert.strictEqual(userInfo.amount, amount);
      assert.strictEqual(await vault.totalStaked(), amount);
    });

    it("3. stake(0) phải revert", async function () {
      await expectRevert(
        vault.connect(user1).stake(0),
        "StakingVault: amount must be > 0"
      );
    });
  });

  describe("Unstake", function () {
    it("4. unstake thành công và token quay về user", async function () {
      const stakeAmount = ethers.parseEther("100");
      const unstakeAmount = ethers.parseEther("40");

      await stakeAsUser(stakeAmount);

      const balanceBeforeUnstake = await token.balanceOf(user1.address);
      await vault.connect(user1).unstake(unstakeAmount);

      const balanceAfterUnstake = await token.balanceOf(user1.address);
      const userInfo = await vault.userInfo(user1.address);

      assert.strictEqual(balanceAfterUnstake - balanceBeforeUnstake, unstakeAmount);
      assert.strictEqual(
        await token.balanceOf(await vault.getAddress()),
        stakeAmount - unstakeAmount
      );
      assert.strictEqual(userInfo.amount, stakeAmount - unstakeAmount);
    });

    it("5. unstake vượt quá số đã stake phải revert", async function () {
      await stakeAsUser(ethers.parseEther("50"));

      await expectRevert(
        vault.connect(user1).unstake(ethers.parseEther("60")),
        "StakingVault: insufficient stake"
      );
    });
  });

  describe("Rewards", function () {
    it("6. pendingRewards(user) tăng sau khi tăng thời gian", async function () {
      const amount = ethers.parseEther("100");
      await stakeAsUser(amount);

      const pendingBefore = await vault.pendingRewards(user1.address);
      await networkHelpers.time.increase(3600);
      const pendingAfter = await vault.pendingRewards(user1.address);

      assert.strictEqual(pendingBefore, 0n);
      assert.ok(pendingAfter > pendingBefore);
    });

    it("7. claimRewards() phải ghi điểm sang AirdropPoints", async function () {
      const amount = ethers.parseEther("100");
      await stakeAsUser(amount);
      await networkHelpers.time.increase(120);

      const pendingBeforeClaim = await vault.pendingRewards(user1.address);
      const tx = await vault.connect(user1).claimRewards();
      const receipt = await tx.wait();
      const airdropPointsAddress = (await airdropPoints.getAddress()).toLowerCase();
      const pointsLog = receipt.logs.find(
        (log: any) => log.address.toLowerCase() === airdropPointsAddress
      );

      assert.ok(pointsLog);

      const parsedLog = pointsRecorderInterface.parseLog({
        topics: pointsLog.topics,
        data: pointsLog.data,
      });

      const recordedPoints = parsedLog?.args.points as bigint;

      assert.ok(parsedLog);
      assert.strictEqual(parsedLog.args.user, user1.address);
      assert.ok(recordedPoints > 0n);
      assert.ok(recordedPoints >= pendingBeforeClaim);
      assert.strictEqual(await vault.pendingRewards(user1.address), 0n);
    });
  });

  describe("Emergency Withdraw", function () {
    it("8. emergencyWithdraw() phải trả toàn bộ token và reset state reward", async function () {
      const amount = ethers.parseEther("250");
      await stakeAsUser(amount);
      await networkHelpers.time.increase(600);

      assert.ok((await vault.pendingRewards(user1.address)) > 0n);

      await vault.connect(user1).emergencyWithdraw();

      const userInfo = await vault.userInfo(user1.address);

      assert.strictEqual(await token.balanceOf(user1.address), initialUserBalance);
      assert.strictEqual(await token.balanceOf(await vault.getAddress()), 0n);
      assert.strictEqual(await vault.totalStaked(), 0n);
      assert.strictEqual(userInfo.amount, 0n);
      assert.strictEqual(userInfo.rewardDebt, 0n);
      assert.strictEqual(userInfo.unclaimedRewards, 0n);
      assert.strictEqual(await vault.pendingRewards(user1.address), 0n);
    });
  });
});
