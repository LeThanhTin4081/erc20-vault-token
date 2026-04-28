import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

describe("VaultToken system invariants", function () {
  let ethers: any;
  let networkHelpers: any;
  let accessManager: any;
  let token: any;
  let locker: any;
  let treasury: any;
  let airdropPoints: any;
  let stakingVault: any;
  let distributor: any;
  let admin: any;
  let user1: any;
  let user2: any;

  async function expectRevert(promise: Promise<any>, expectedError: string) {
    try {
      await promise;
      assert.fail(`Expected transaction to revert with: ${expectedError}`);
    } catch (error: any) {
      assert.match(error.message, new RegExp(expectedError.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }

  beforeEach(async function () {
    const connection = await hre.network.connect();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
    [admin, user1, user2] = await ethers.getSigners();

    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());

    const LockerFactory = await ethers.getContractFactory("TokenLocker");
    locker = await LockerFactory.deploy(
      await token.getAddress(),
      await accessManager.getAddress()
    );

    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(
      await token.getAddress(),
      await accessManager.getAddress()
    );

    const PointsFactory = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await PointsFactory.deploy(await accessManager.getAddress());

    const VaultFactory = await ethers.getContractFactory("StakingVault");
    stakingVault = await VaultFactory.deploy(
      await token.getAddress(),
      await airdropPoints.getAddress()
    );

    const DistributorFactory = await ethers.getContractFactory("AirdropDistributor");
    distributor = await DistributorFactory.deploy(
      await airdropPoints.getAddress(),
      await treasury.getAddress()
    );

    await accessManager.grantRole(await airdropPoints.VAULT_ROLE(), await stakingVault.getAddress());
    await token.transfer(user1.address, ethers.parseEther("1000"));
    await token.transfer(user2.address, ethers.parseEther("1000"));
  });

  it("1. Trước launch phải chặn transfer, stake và lock của user", async function () {
    const amount = ethers.parseEther("10");

    await token.connect(user1).approve(await stakingVault.getAddress(), amount);
    await token.connect(user1).approve(await locker.getAddress(), amount);

    await expectRevert(
      token.connect(user1).transfer(user2.address, amount),
      "LaunchToken: trading is not open yet"
    );

    await expectRevert(
      stakingVault.connect(user1).stake(amount),
      "LaunchToken: trading is not open yet"
    );

    await expectRevert(
      locker.connect(user1).lock(amount, 60),
      "TokenLocker: system not launched yet"
    );
  });

  it("2. Luồng stake -> claim reward point -> fund treasury -> claim airdrop hoạt động end-to-end", async function () {
    await token.openTrading();

    const stakeAmount = ethers.parseEther("100");
    await token.connect(user1).approve(await stakingVault.getAddress(), stakeAmount);
    await stakingVault.connect(user1).stake(stakeAmount);

    await networkHelpers.time.increase(60);
    await stakingVault.connect(user1).claimRewards();

    const snapshotId = await airdropPoints.currentSnapshotId();
    const points = await airdropPoints.getPoints(user1.address, snapshotId);
    assert.ok(points > 0n);

    const treasuryFloat = ethers.parseEther("10");
    await token.approve(await treasury.getAddress(), points + treasuryFloat);
    await treasury.deposit(points + treasuryFloat);
    await treasury.approveSpender(await distributor.getAddress(), points);

    const balanceBefore = await token.balanceOf(user1.address);
    await distributor.connect(user1).claim(snapshotId);
    const balanceAfter = await token.balanceOf(user1.address);

    assert.strictEqual(balanceAfter - balanceBefore, points);
    assert.strictEqual(await distributor.claimed(snapshotId, user1.address), true);
    assert.strictEqual(await treasury.getBalance(), treasuryFloat);
  });

  it("3. Snapshot giữ nguyên dữ liệu cũ và tách điểm theo từng epoch", async function () {
    const vaultRole = await airdropPoints.VAULT_ROLE();
    await accessManager.grantRole(vaultRole, admin.address);

    const pointsEpoch0 = ethers.parseEther("5");
    const pointsEpoch1 = ethers.parseEther("7");

    await airdropPoints.addPoints(user1.address, pointsEpoch0);
    const snapshot0 = await airdropPoints.currentSnapshotId();

    await airdropPoints.snapshot();
    const snapshot1 = await airdropPoints.currentSnapshotId();
    await airdropPoints.addPoints(user1.address, pointsEpoch1);

    assert.strictEqual(await airdropPoints.getPoints(user1.address, snapshot0), pointsEpoch0);
    assert.strictEqual(await airdropPoints.getPoints(user1.address, snapshot1), pointsEpoch1);
    assert.strictEqual(await distributor.calculateReward(user1.address, snapshot0), pointsEpoch0);
    assert.strictEqual(await distributor.calculateReward(user1.address, snapshot1), pointsEpoch1);
  });

  it("4. Không được claim 2 lần cùng snapshot nhưng được claim snapshot khác", async function () {
    const vaultRole = await airdropPoints.VAULT_ROLE();
    await accessManager.grantRole(vaultRole, admin.address);

    const reward0 = ethers.parseEther("2");
    const reward1 = ethers.parseEther("3");

    await airdropPoints.addPoints(user1.address, reward0);
    const snapshot0 = await airdropPoints.currentSnapshotId();

    await airdropPoints.snapshot();
    const snapshot1 = await airdropPoints.currentSnapshotId();
    await airdropPoints.addPoints(user1.address, reward1);

    await token.openTrading();
    await token.approve(await treasury.getAddress(), reward0 + reward1);
    await treasury.deposit(reward0 + reward1);
    await treasury.approveSpender(await distributor.getAddress(), reward0 + reward1);

    const balanceBefore = await token.balanceOf(user1.address);
    await distributor.connect(user1).claim(snapshot0);

    await expectRevert(
      distributor.connect(user1).claim(snapshot0),
      "AirdropDistributor: already claimed"
    );

    await distributor.connect(user1).claim(snapshot1);
    const balanceAfter = await token.balanceOf(user1.address);

    assert.strictEqual(balanceAfter - balanceBefore, reward0 + reward1);
    assert.strictEqual(await distributor.claimed(snapshot0, user1.address), true);
    assert.strictEqual(await distributor.claimed(snapshot1, user1.address), true);
  });

  it("5. emergencyWithdraw trả vốn, reset reward và không cộng điểm airdrop", async function () {
    await token.openTrading();

    const stakeAmount = ethers.parseEther("150");
    await token.connect(user1).approve(await stakingVault.getAddress(), stakeAmount);
    await stakingVault.connect(user1).stake(stakeAmount);

    await networkHelpers.time.increase(300);
    assert.ok((await stakingVault.pendingRewards(user1.address)) > 0n);

    await stakingVault.connect(user1).emergencyWithdraw();
    const userInfo = await stakingVault.userInfo(user1.address);

    assert.strictEqual(userInfo.amount, 0n);
    assert.strictEqual(userInfo.rewardDebt, 0n);
    assert.strictEqual(userInfo.unclaimedRewards, 0n);
    assert.strictEqual(await stakingVault.pendingRewards(user1.address), 0n);
    assert.strictEqual(await airdropPoints.getCurrentPoints(user1.address), 0n);
  });

  it("6. Treasury từ chối các thao tác amount/address không an toàn", async function () {
    await token.openTrading();

    await expectRevert(
      treasury.deposit(0),
      "Treasury: amount must be > 0"
    );

    await expectRevert(
      treasury.withdraw(user1.address, 0),
      "Treasury: amount must be > 0"
    );

    await expectRevert(
      treasury.withdraw(ethers.ZeroAddress, 1),
      "Treasury: cannot withdraw to zero address"
    );

    await expectRevert(
      treasury.approveSpender(ethers.ZeroAddress, 1),
      "Treasury: cannot approve zero address"
    );
  });
});
