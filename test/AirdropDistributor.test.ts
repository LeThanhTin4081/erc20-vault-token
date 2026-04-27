import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite cho AirdropDistributor.sol
 * Sử dụng CONTRACT THẬT (không dùng Mock) vì tất cả 7 contract đã code xong.
 */
describe("AirdropDistributor", function () {
  let accessManager: any;
  let token: any;
  let airdropPoints: any;
  let treasury: any;
  let distributor: any;
  let admin: any;
  let user1: any;
  let user2: any;
  let ethers: any;

  let VAULT_ROLE: string;
  let ADMIN_ROLE: string;

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

    // DEPLOY TOÀN BỘ HỆ THỐNG THẬT (đúng thứ tự kiến trúc)

    // 1. AccessManager
    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // 2. LaunchToken
    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());

    // 3. AirdropPoints (dùng AccessManager chung)
    const PointsFactory = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await PointsFactory.deploy(await accessManager.getAddress());

    // 4. Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(
      await token.getAddress(),
      await accessManager.getAddress()
    );

    // 5. AirdropDistributor
    const DistributorFactory = await ethers.getContractFactory("AirdropDistributor");
    distributor = await DistributorFactory.deploy(
      await airdropPoints.getAddress(),
      await treasury.getAddress()
    );

    // SETUP HỆ THỐNG (giống quy trình admin sau deploy)

    // Lấy role hash
    VAULT_ROLE = await airdropPoints.VAULT_ROLE();
    ADMIN_ROLE = await airdropPoints.ADMIN_ROLE();

    // Mở trading để cho phép giao dịch
    await token.openTrading();

    // Admin nạp 200,000 VLT vào Treasury đúng phần Community/Airdrop trong tokenomics
    const depositAmount = ethers.parseEther("200000");
    await token.approve(await treasury.getAddress(), depositAmount);
    await treasury.deposit(depositAmount);

    // Admin cấp allowance cho Distributor được rút từ Treasury
    await treasury.approveSpender(await distributor.getAddress(), depositAmount);
  });

  it("1. calculateReward - trả về đúng số token dựa trên point", async function () {
    // Cấp VAULT_ROLE và cộng điểm cho user1 qua flow thật
    await accessManager.grantRole(VAULT_ROLE, admin.address);
    await airdropPoints.addPoints(user1.address, ethers.parseEther("5"));

    // Điểm được lưu theo 18 decimals, 5 điểm hiển thị = 5e18 raw points.
    const expectedReward = ethers.parseEther("5");
    const snapshotId = await airdropPoints.currentSnapshotId();
    const reward = await distributor.calculateReward(user1.address, snapshotId);

    expect(reward).to.equal(expectedReward);
  });

  it("2. claim - user claim token thành công", async function () {
    // Setup: cộng điểm cho user1 ở đợt 0
    await accessManager.grantRole(VAULT_ROLE, admin.address);
    await airdropPoints.addPoints(user1.address, ethers.parseEther("5"));
    const snapshotId = await airdropPoints.currentSnapshotId();

    const expectedReward = ethers.parseEther("5");
    const balanceBefore = await token.balanceOf(user1.address);

    // User1 thực hiện claim
    await distributor.connect(user1).claim(snapshotId);

    const balanceAfter = await token.balanceOf(user1.address);

    // Kiểm tra số dư đã tăng lên
    expect(balanceAfter - balanceBefore).to.equal(expectedReward);

    // Kiểm tra trạng thái claimed là true
    const isClaimed = await distributor.claimed(snapshotId, user1.address);
    expect(isClaimed).to.be.true;
  });

  it("3. claim - ngăn chặn Double Claim", async function () {
    await accessManager.grantRole(VAULT_ROLE, admin.address);
    await airdropPoints.addPoints(user1.address, ethers.parseEther("5"));
    const snapshotId = await airdropPoints.currentSnapshotId();

    // Lần claim đầu tiên sẽ thành công
    await distributor.connect(user1).claim(snapshotId);

    // Lần claim thứ hai sẽ thất bại (Double claim)
    await expectRevert(
      distributor.connect(user1).claim(snapshotId),
      "AirdropDistributor: already claimed"
    );
  });

  it("4. claim - user không có điểm không thể claim", async function () {
    const snapshotId = await airdropPoints.currentSnapshotId();

    // User2 có 0 điểm → claim thất bại
    await expectRevert(
      distributor.connect(user2).claim(snapshotId),
      "AirdropDistributor: zero reward"
    );
  });

  it("5. claim - claim ở nhiều snapshot khác nhau", async function () {
    await accessManager.grantRole(VAULT_ROLE, admin.address);

    // Đợt snapshot 0: cộng 3 điểm cho user1
    await airdropPoints.addPoints(user1.address, ethers.parseEther("3"));
    const snapshot0 = await airdropPoints.currentSnapshotId();

    // Chốt sổ → chuyển sang đợt 1
    await airdropPoints.snapshot();

    // Đợt snapshot 1: cộng 4 điểm cho user1
    await airdropPoints.addPoints(user1.address, ethers.parseEther("4"));
    const snapshot1 = await airdropPoints.currentSnapshotId();

    // Claim đợt 0
    await distributor.connect(user1).claim(snapshot0);
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));

    // Claim đợt 1
    await distributor.connect(user1).claim(snapshot1);
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("7"));

    // Kiểm tra trạng thái
    expect(await distributor.claimed(snapshot0, user1.address)).to.be.true;
    expect(await distributor.claimed(snapshot1, user1.address)).to.be.true;
  });

  it("6. claim - Treasury hết tiền thì revert", async function () {
    await accessManager.grantRole(VAULT_ROLE, admin.address);

    // Cộng số điểm CỰC LỚN (nhiều hơn số token trong Treasury)
    await airdropPoints.addPoints(user1.address, ethers.parseEther("999999"));
    const snapshotId = await airdropPoints.currentSnapshotId();

    // Claim sẽ thất bại vì Treasury không đủ allowance/balance
    await expectRevert(
      distributor.connect(user1).claim(snapshotId),
      "ERC20InsufficientAllowance"
    );
  });
});
