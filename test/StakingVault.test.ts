import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

describe("StakingVault", function () {
  let accessManager: any;
  let launchToken: any;
  let airdropPoints: any;
  let stakingVault: any;
  let admin: any;
  let user1: any;
  let user2: any;
  let ethers: any;
  let VAULT_ROLE: any;

  async function expectRevert(promise: Promise<any>, expectedError: string) {
    try {
      await promise;
      expect.fail(`Expected transaction to revert with: ${expectedError}`);
    } catch (error: any) {
      expect(error.message).to.include(expectedError);
    }
  }

  beforeEach(async function () {
    const connection = await hre.network.connect();
    ethers = connection.ethers;

    [admin, user1, user2] = await ethers.getSigners();

    // 1. Deploy AccessManager
    const AccessManager = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManager.deploy();

    // 2. Deploy LaunchToken
    const LaunchToken = await ethers.getContractFactory("LaunchToken");
    launchToken = await LaunchToken.deploy(await accessManager.getAddress());

    // 3. Deploy AirdropPoints (truyền AccessManager vào constructor)
    const AirdropPoints = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await AirdropPoints.deploy(await accessManager.getAddress());

    // 4. Deploy StakingVault
    const StakingVault = await ethers.getContractFactory("StakingVault");
    stakingVault = await StakingVault.deploy(
      await launchToken.getAddress(),
      await airdropPoints.getAddress()
    );

    // Mở khóa giao dịch để test
    await launchToken.openTrading();

    // Lấy động VAULT_ROLE
    VAULT_ROLE = await airdropPoints.VAULT_ROLE();

    // Cấp quyền VAULT_ROLE cho StakingVault trên AccessManager (đúng kiến trúc)
    await accessManager.grantRole(VAULT_ROLE, await stakingVault.getAddress());

    // Chuyển một ít token cho user1 để test
    const stakeAmount = ethers.parseEther("1000");
    await launchToken.transfer(user1.address, stakeAmount);
    await launchToken.connect(user1).approve(await stakingVault.getAddress(), stakeAmount);
  });

  describe("Deploy", function () {
    it("1. Deploy StakingVault thành công", async function () {
      expect(await stakingVault.stakingToken()).to.equal(await launchToken.getAddress());
      expect(await stakingVault.airdropPoints()).to.equal(await airdropPoints.getAddress());
    });
  });

  describe("Launch Gating", function () {
    it("2. stake - trước khi launch -> revert", async function () {
      // Deploy lại hệ thống MỚI (chưa openTrading)
      const AccessManager2 = await ethers.getContractFactory("AccessManager");
      const am2 = await AccessManager2.deploy();

      const LaunchToken2 = await ethers.getContractFactory("LaunchToken");
      const lt2 = await LaunchToken2.deploy(await am2.getAddress());

      const AirdropPoints2 = await ethers.getContractFactory("AirdropPoints");
      const ap2 = await AirdropPoints2.deploy(await am2.getAddress());

      const StakingVault2 = await ethers.getContractFactory("StakingVault");
      const sv2 = await StakingVault2.deploy(await lt2.getAddress(), await ap2.getAddress());

      // Chuyển token cho user1 (admin có thể chuyển trước launch)
      await lt2.transfer(user1.address, ethers.parseEther("100"));
      await lt2.connect(user1).approve(await sv2.getAddress(), ethers.parseEther("100"));

      // Cố stake khi chưa launch → revert
      await expectRevert(
        sv2.connect(user1).stake(ethers.parseEther("10")),
        "StakingVault: system not launched yet"
      );
    });
  });

  describe("Stake", function () {
    it("3. stake - phải lớn hơn 0", async function () {
      await expectRevert(
        stakingVault.connect(user1).stake(0),
        "StakingVault: amount must be > 0"
      );
    });

    it("4. stake - nạp token thành công", async function () {
      const stakeAmount = ethers.parseEther("100");
      await stakingVault.connect(user1).stake(stakeAmount);

      const userInfo = await stakingVault.userInfo(user1.address);
      expect(userInfo.amount).to.equal(stakeAmount);
      expect(await stakingVault.totalStaked()).to.equal(stakeAmount);
    });
  });

  describe("Unstake", function () {
    beforeEach(async function () {
      await stakingVault.connect(user1).stake(ethers.parseEther("100"));
    });

    it("5. unstake - phải lớn hơn 0", async function () {
      await expectRevert(
        stakingVault.connect(user1).unstake(0),
        "StakingVault: amount must be > 0"
      );
    });

    it("6. unstake - không đủ số dư bị revert", async function () {
      await expectRevert(
        stakingVault.connect(user1).unstake(ethers.parseEther("200")),
        "StakingVault: insufficient stake"
      );
    });

    it("7. unstake - rút token thành công", async function () {
      const unstakeAmount = ethers.parseEther("50");
      await stakingVault.connect(user1).unstake(unstakeAmount);

      const userInfo = await stakingVault.userInfo(user1.address);
      expect(userInfo.amount).to.equal(ethers.parseEther("50"));
      expect(await stakingVault.totalStaked()).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Claim Rewards (Airdrop Points)", function () {
    beforeEach(async function () {
      await stakingVault.connect(user1).stake(ethers.parseEther("100"));
    });

    it("8. claimRewards - cộng điểm airdrop thành công sau một thời gian", async function () {
      // Tua nhanh thời gian thêm 10 giây
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);

      // Gọi claimRewards
      await stakingVault.connect(user1).claimRewards();

      // Kiểm tra điểm airdrop của user1 có tăng lên không
      const userInfo = await stakingVault.userInfo(user1.address);
      expect(userInfo.unclaimedRewards).to.equal(0n);
      
      // Số điểm cụ thể phụ thuộc vào thời gian chính xác của block, nhưng chắc chắn phải > 0
      const currentSnapshotId = await airdropPoints.currentSnapshotId();
      const points = await airdropPoints.getPoints(user1.address, currentSnapshotId);
      expect(points > 0n).to.be.true;
    });
  });

  describe("Emergency Withdraw", function () {
    beforeEach(async function () {
      await stakingVault.connect(user1).stake(ethers.parseEther("100"));
    });

    it("9. emergencyWithdraw - rút lại toàn bộ gốc ngay lập tức và bỏ thưởng", async function () {
      await stakingVault.connect(user1).emergencyWithdraw();

      const userInfo = await stakingVault.userInfo(user1.address);
      expect(userInfo.amount).to.equal(0n);
      expect(await stakingVault.totalStaked()).to.equal(0n);

      // Số dư token LaunchToken của user1 phải phục hồi về 1000 như ban đầu
      expect(await launchToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Pending Rewards", function () {
    it("10. pendingRewards - trả về đúng số reward tích lũy", async function () {
      await stakingVault.connect(user1).stake(ethers.parseEther("100"));

      // Tua nhanh 10 giây
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);

      const pending = await stakingVault.pendingRewards(user1.address);
      expect(pending > 0n).to.be.true;
    });
  });
});
