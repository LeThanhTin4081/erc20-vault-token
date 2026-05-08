import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

describe("LaunchToken - security and tokenomics cases", function () {
  let ethers: any;
  let accessManager: any;
  let token: any;
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
    [admin, user1, user2] = await ethers.getSigners();

    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());
  });

  it("1. Chỉ admin được set burnRate và burnRate không vượt quá 10%", async function () {
    await expectRevert(
      token.connect(user1).setBurnRate(100),
      "LaunchToken: caller is not admin"
    );

    await expectRevert(
      token.connect(admin).setBurnRate(1001),
      "LaunchToken: burn rate max 10%"
    );

    await token.connect(admin).setBurnRate(250);
    assert.strictEqual(await token.burnRate(), 250n);
  });

  it("2. Auto-burn làm giảm số token người nhận và giảm totalSupply", async function () {
    await token.openTrading();
    await token.setBurnRate(100);

    const transferAmount = ethers.parseEther("100");
    const expectedBurn = ethers.parseEther("1");
    const supplyBefore = await token.totalSupply();

    await token.transfer(user1.address, transferAmount);

    assert.strictEqual(await token.balanceOf(user1.address), transferAmount - expectedBurn);
    assert.strictEqual(supplyBefore - await token.totalSupply(), expectedBurn);
  });

  it("3. Pause chặn user transfer nhưng vẫn cho admin xử lý khẩn cấp", async function () {
    await token.openTrading();
    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.pause();

    await expectRevert(
      token.connect(user1).transfer(user2.address, ethers.parseEther("10")),
      "LaunchToken: token transfer while paused"
    );

    await token.connect(admin).transfer(user2.address, ethers.parseEther("10"));
    assert.strictEqual(await token.balanceOf(user2.address), ethers.parseEther("10"));
  });
});
