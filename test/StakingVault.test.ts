import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

describe("StakingVault", function () {
  let ethers: any;
  let networkHelpers: any;
  let admin: any;
  let user1: any;
  let accessManager: any;
  let token: any;
  let vault: any;
  let airdropPoints: any;
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

    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());

    const AirdropPointsFactory = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await AirdropPointsFactory.deploy(await accessManager.getAddress());

    const VaultFactory = await ethers.getContractFactory("StakingVault");
    vault = await VaultFactory.deploy(
      await token.getAddress(),
      await airdropPoints.getAddress()
    );

    await accessManager.grantRole(await airdropPoints.VAULT_ROLE(), await vault.getAddress());

    initialUserBalance = ethers.parseEther("1000");
    await token.transfer(user1.address, initialUserBalance);
    await token.openTrading();
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

    it("7. claimRewards() phải ghi điểm sang AirdropPoints thật", async function () {
      const amount = ethers.parseEther("100");
      await stakeAsUser(amount);
      await networkHelpers.time.increase(120);

      const pendingBeforeClaim = await vault.pendingRewards(user1.address);
      await vault.connect(user1).claimRewards();

      const recordedPoints = await airdropPoints.getCurrentPoints(user1.address);
      const userInfo = await vault.userInfo(user1.address);

      assert.ok(recordedPoints > 0n);
      assert.ok(recordedPoints >= pendingBeforeClaim);
      assert.strictEqual(await vault.pendingRewards(user1.address), 0n);
      assert.strictEqual(userInfo.unclaimedRewards, 0n);
    });

    it("8. claimRewards() khi chưa có reward không cộng điểm", async function () {
      await vault.connect(user1).claimRewards();

      assert.strictEqual(await airdropPoints.getCurrentPoints(user1.address), 0n);
      assert.strictEqual(await vault.pendingRewards(user1.address), 0n);
    });
  });

  describe("Emergency Withdraw", function () {
    it("9. emergencyWithdraw() phải trả toàn bộ token và reset state reward", async function () {
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
