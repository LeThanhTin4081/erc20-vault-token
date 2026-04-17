import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("VaultToken - Kich ban kiem thu", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let decimals: number;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    token = await ethers.deployContract("VaultToken");
    await token.waitForDeployment();
    decimals = Number(await token.decimals());
  });

  it("Bai 1: Kiem tra metadata va tong cung ban dau", async function () {
    assert.equal(await token.name(), "VaultToken");
    assert.equal(await token.symbol(), "VLT");

    const expectedSupply = ethers.parseUnits("1000000", decimals);
    assert.equal(await token.totalSupply(), expectedSupply);
  });

  it("Bai 2: Owner phai co du role admin, minter, pauser", async function () {
    const adminRole = await token.DEFAULT_ADMIN_ROLE();
    const minterRole = await token.MINTER_ROLE();
    const pauserRole = await token.PAUSER_ROLE();

    assert.equal(await token.hasRole(adminRole, owner.address), true);
    assert.equal(await token.hasRole(minterRole, owner.address), true);
    assert.equal(await token.hasRole(pauserRole, owner.address), true);
  });

  it("Bai 3: Minter mint thanh cong va phat event Transfer", async function () {
    const mintAmount = ethers.parseUnits("500", decimals);

    const tx = await token.mint(addr1.address, mintAmount);
    const receipt = await tx.wait();
    assert.ok(receipt);

    const parsedLogs = receipt.logs
      .map((log: any) => {
        try {
          return token.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const transferEvent = parsedLogs.find((event: any) => event.name === "Transfer");
    assert.ok(transferEvent);
    assert.equal(transferEvent.args.from, ethers.ZeroAddress);
    assert.equal(transferEvent.args.to, addr1.address);
    assert.equal(transferEvent.args.value, mintAmount);
    assert.equal(await token.balanceOf(addr1.address), mintAmount);
  });

  it("Bai 4: Tai khoan khong co MINTER role thi khong duoc mint", async function () {
    const mintAmount = ethers.parseUnits("1", decimals);

    await assert.rejects(
      token.connect(addr1).mint(addr1.address, mintAmount),
      /AccessControlUnauthorizedAccount|reverted/i,
    );
  });

  it("Bai 5: Mint vuot cap thi phai revert", async function () {
    const currentSupply = await token.totalSupply();
    const cap = ethers.parseUnits("10000000", decimals);
    const exceedAmount = cap - currentSupply + 1n;

    await assert.rejects(
      token.mint(addr1.address, exceedAmount),
      /ERC20ExceededCap|reverted/i,
    );
  });

  it("Bai 6: Burn thanh cong thi totalSupply phai giam", async function () {
    const burnAmount = ethers.parseUnits("250", decimals);
    const totalBefore = await token.totalSupply();

    await token.burn(burnAmount);

    assert.equal(await token.totalSupply(), totalBefore - burnAmount);
  });

  it("Bai 7: Khi pause thi transfer bi chan", async function () {
    const transferAmount = ethers.parseUnits("10", decimals);

    await token.pause();
    await assert.rejects(
      token.transfer(addr1.address, transferAmount),
      /EnforcedPause|reverted/i,
    );
  });

  it("Bai 8: Unpause xong thi transfer lai duoc", async function () {
    const transferAmount = ethers.parseUnits("10", decimals);

    await token.pause();
    await token.unpause();
    await token.transfer(addr1.address, transferAmount);

    assert.equal(await token.balanceOf(addr1.address), transferAmount);
  });

  it("Bai 9: Admin grant MINTER role cho user moi", async function () {
    const minterRole = await token.MINTER_ROLE();
    const mintAmount = ethers.parseUnits("15", decimals);

    await token.grantRole(minterRole, addr1.address);
    assert.equal(await token.hasRole(minterRole, addr1.address), true);

    await token.connect(addr1).mint(addr2.address, mintAmount);
    assert.equal(await token.balanceOf(addr2.address), mintAmount);
  });

  it("Bai 10: Admin revoke MINTER role", async function () {
    const minterRole = await token.MINTER_ROLE();
    const mintAmount = ethers.parseUnits("1", decimals);

    await token.grantRole(minterRole, addr1.address);
    await token.revokeRole(minterRole, addr1.address);
    assert.equal(await token.hasRole(minterRole, addr1.address), false);

    await assert.rejects(
      token.connect(addr1).mint(addr2.address, mintAmount),
      /AccessControlUnauthorizedAccount|reverted/i,
    );
  });

  it("Bai 11: Transfer giua 2 user phai thanh cong", async function () {
    const transferAmount = ethers.parseUnits("35", decimals);

    await token.transfer(addr1.address, transferAmount);
    assert.equal(await token.balanceOf(addr1.address), transferAmount);
  });

  it("Bai 12: Approve va transferFrom phai thanh cong", async function () {
    const fundingAmount = ethers.parseUnits("100", decimals);
    const spendAmount = ethers.parseUnits("40", decimals);

    await token.transfer(addr1.address, fundingAmount);
    await token.connect(addr1).approve(addr2.address, spendAmount);
    await token.connect(addr2).transferFrom(addr1.address, addr2.address, spendAmount);

    assert.equal(await token.balanceOf(addr2.address), spendAmount);
    assert.equal(await token.balanceOf(addr1.address), fundingAmount - spendAmount);
    assert.equal(await token.allowance(addr1.address, addr2.address), 0n);
  });
});
