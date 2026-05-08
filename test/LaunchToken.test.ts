import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite cho LaunchToken.sol
 */
describe("LaunchToken", function () {
  let accessManager: any;
  let token: any;
  let admin: any;
  let minter: any;
  let user1: any;
  let user2: any;
  let ethers: any;

  // Lấy lại các mã Role
  let ADMIN_ROLE: string;
  let MINTER_ROLE: string;

  // HELPER: Kiểm tra revert
  async function expectRevert(promise: Promise<any>, expectedError: string) {
    try {
      await promise;
      expect.fail(`Expected transaction to revert with: ${expectedError}`);
    } catch (error: any) {
      expect(error.message).to.include(expectedError);
    }
  }

  // SETUP
  beforeEach(async function () {
    const connection = await hre.network.connect();
    ethers = connection.ethers;

    [admin, minter, user1, user2] = await ethers.getSigners();

    // Tính toán mã băm của roles
    ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

    // 1. Deploy AccessManager thật
    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // Cấp quyền MINTER cho tài khoản `minter`
    await accessManager.connect(admin).grantRole(MINTER_ROLE, minter.address);

    // 2. Deploy LaunchToken thật
    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());
  });

  // TEST CASE

  describe("Khởi tạo (Deployment)", function () {
    it("1. Phải có tổng cung ban đầu là 1,000,000 VLT", async function () {
      const expectedSupply = ethers.parseEther("1000000");
      expect(await token.totalSupply()).to.equal(expectedSupply);
      
      // Admin (người deploy) phải cầm toàn bộ số này
      expect(await token.balanceOf(admin.address)).to.equal(expectedSupply);
    });

    it("2. Phải set giới hạn tối đa (Cap) là 10,000,000 VLT", async function () {
      const expectedCap = ethers.parseEther("10000000");
      expect(await token.cap()).to.equal(expectedCap);
    });

    it("3. Cờ tradingOpen ban đầu phải là false", async function () {
      expect(await token.tradingOpen()).to.be.false;
    });
  });

  describe("Luật chuyển tiền trước khi Launch (Launch Gating)", function () {
    it("4. Admin được phép chuyển token trước khi Launch", async function () {
      const amount = ethers.parseEther("100");
      // Admin chuyển cho user1 thành công mà không bị revert
      await token.connect(admin).transfer(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("5. Người bình thường KHÔNG được chuyển token trước khi Launch", async function () {
      const amount = ethers.parseEther("100");
      // Admin nạp tiền cho user1 trước
      await token.connect(admin).transfer(user1.address, amount);

      // User1 cố tình chuyển cho user2 -> Bị khóa chặn lại
      await expectRevert(
        token.connect(user1).transfer(user2.address, amount),
        "LaunchToken: trading is not open yet"
      );
    });
  });

  describe("Mở hệ thống (Open Trading)", function () {
    it("6. Người thường không thể gọi hàm openTrading", async function () {
      await expectRevert(
        token.connect(user1).openTrading(),
        "LaunchToken: caller is not admin"
      );
    });

    it("7. Admin gọi openTrading thành công -> mọi người được giao dịch", async function () {
      const amount = ethers.parseEther("100");
      await token.connect(admin).transfer(user1.address, amount);

      // Admin mở khóa hệ thống
      await token.connect(admin).openTrading();
      expect(await token.tradingOpen()).to.be.true;

      // Bây giờ user1 chuyển cho user2 sẽ THÀNH CÔNG
      await token.connect(user1).transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });

    it("8. Không thể gọi openTrading 2 lần", async function () {
      await token.connect(admin).openTrading();
      // Gọi lần 2 sẽ bị lỗi
      await expectRevert(
        token.connect(admin).openTrading(),
        "LaunchToken: trading is already open"
      );
    });
  });

  describe("Chức năng Đúc (Mint)", function () {
    it("9. Người thường không được gọi hàm mint", async function () {
      await expectRevert(
        token.connect(user1).mint(user1.address, ethers.parseEther("10")),
        "LaunchToken: caller is not minter"
      );
    });

    it("10. Người có quyền MINTER_ROLE đúc token thành công", async function () {
      const amount = ethers.parseEther("500");
      await token.connect(minter).mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("11. KHÔNG THỂ đúc vượt quá Hard Cap (10 triệu VLT)", async function () {
      // Hiện tại đã có 1 triệu. Cap là 10 triệu.
      // Cố tình đúc thêm 9.5 triệu -> Tổng sẽ là 10.5 triệu -> Phải bị chặn
      const hugeAmount = ethers.parseEther("9500000");
      
      await expectRevert(
        token.connect(minter).mint(user1.address, hugeAmount),
        "ERC20ExceededCap"
      );
    });
  });

  describe("Chức năng Đốt (Burn)", function () {
    it("12. Bất kỳ ai cũng có thể tự đốt token của mình để làm giảm tổng cung", async function () {
      // Mở trading trước để cho phép người dùng tự do giao dịch / đốt
      await token.connect(admin).openTrading();
      
      // Admin chuyển cho user1 100 token
      const amount = ethers.parseEther("100");
      await token.connect(admin).transfer(user1.address, amount);

      const supplyBefore = await token.totalSupply();

      // User1 quyết định đốt 40 token
      const burnAmount = ethers.parseEther("40");
      await token.connect(user1).burn(burnAmount);

      const supplyAfter = await token.totalSupply();

      // Tổng cung trên toàn mạng lưới phải giảm đi 40 token
      expect(supplyBefore - supplyAfter).to.equal(burnAmount);
      // Số dư của user1 cũng phải giảm 40 token
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("60"));
    });
  });
});
