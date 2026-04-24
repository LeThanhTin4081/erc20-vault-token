import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

describe("AirdropDistributor", function () {
  let token: any;
  let points: any;
  let treasury: any;
  let distributor: any;
  let admin: any;
  let user1: any;
  let user2: any;
  let ethers: any;

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

    const TokenFactory = await ethers.getContractFactory("MockDistributorToken");
    token = await TokenFactory.deploy();

    const PointsFactory = await ethers.getContractFactory("MockAirdropPoints");
    points = await PointsFactory.deploy();

    const TreasuryFactory = await ethers.getContractFactory("MockTreasury");
    treasury = await TreasuryFactory.deploy(await token.getAddress());

    const DistributorFactory = await ethers.getContractFactory("AirdropDistributor");
    distributor = await DistributorFactory.deploy(
      await points.getAddress(),
      await treasury.getAddress()
    );

    // Cài đặt: Mint token cho treasury
    const amount = ethers.parseEther("100000");
    await token.mint(await treasury.getAddress(), amount);

    // Cài đặt: Treasury cấp quyền cho Distributor chi tiêu token
    await treasury.approveSpender(await distributor.getAddress(), amount);
  });

  it("1. calculateReward - trả về đúng số token dựa trên point", async function () {
    const snapshotId = 1;
    // Đặt 5 điểm cho user1
    await points.setPoints(user1.address, snapshotId, 5);

    // 1 điểm = 1e18 token
    const expectedReward = ethers.parseEther("5");
    const reward = await distributor.calculateReward(user1.address, snapshotId);

    expect(reward).to.equal(expectedReward);
  });

  it("2. claim - user claim token thành công", async function () {
    const snapshotId = 1;
    await points.setPoints(user1.address, snapshotId, 5);
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
    const snapshotId = 1;
    await points.setPoints(user1.address, snapshotId, 5);
    
    // Lần claim đầu tiên sẽ thành công
    await distributor.connect(user1).claim(snapshotId);

    // Lần claim thứ hai sẽ thất bại (Double claim)
    await expectRevert(
      distributor.connect(user1).claim(snapshotId),
      "AirdropDistributor: already claimed"
    );
  });

  it("4. claim - user không có điểm không thể claim", async function () {
    const snapshotId = 1;
    // User2 có 0 điểm
    await points.setPoints(user2.address, snapshotId, 0);

    // Việc claim sẽ thất bại
    await expectRevert(
      distributor.connect(user2).claim(snapshotId),
      "AirdropDistributor: zero reward"
    );
  });

  it("5. claim - claim ở nhiều snapshot khác nhau", async function () {
    // Đợt snapshot 1
    await points.setPoints(user1.address, 1, 3);
    await distributor.connect(user1).claim(1);
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));

    // Đợt snapshot 2
    await points.setPoints(user1.address, 2, 4);
    await distributor.connect(user1).claim(2);
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("7"));
    
    // Kiểm tra trạng thái
    expect(await distributor.claimed(1, user1.address)).to.be.true;
    expect(await distributor.claimed(2, user1.address)).to.be.true;
  });
});
