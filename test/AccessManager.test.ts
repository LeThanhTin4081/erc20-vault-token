import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite cho AccessManager.sol
 */
describe("AccessManager", function () {
  let accessManager: any;
  let admin: any;
  let user1: any;
  let user2: any;
  let ethers: any;

  // Lấy lại các mã Role (phải khớp 100% với contract AccessManager.sol)
  // Trong Ethers.js, keccak256 trả về mã hash (bytes32)
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  let ADMIN_ROLE: string;
  let MINTER_ROLE: string;
  let VAULT_ROLE: string;

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

    // Lấy 3 tài khoản ảo từ Hardhat
    [admin, user1, user2] = await ethers.getSigners();

    // Lấy Factory của AccessManager thật (trong thư mục core)
    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // Tính toán mã băm của các roles bằng Ethers.js
    ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    VAULT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_ROLE"));
  });

  // TEST CASE

  describe("Khởi tạo (Deployment)", function () {
    it("1. Người deploy phải có quyền DEFAULT_ADMIN_ROLE", async function () {
      // Hàm hasRole kế thừa từ OpenZeppelin
      const hasDefaultAdmin = await accessManager.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
      expect(hasDefaultAdmin).to.be.true;
    });

    it("2. Người deploy phải được cấp quyền ADMIN_ROLE", async function () {
      const hasAdmin = await accessManager.hasRole(ADMIN_ROLE, admin.address);
      expect(hasAdmin).to.be.true;
    });

    it("3. Người bình thường (user1) không được có quyền mặc định", async function () {
      const hasAdmin = await accessManager.hasRole(ADMIN_ROLE, user1.address);
      expect(hasAdmin).to.be.false;
    });
  });

  describe("Cấp quyền (Grant Role)", function () {
    it("4. Admin có thể cấp quyền MINTER_ROLE cho user1", async function () {
      // Trước khi cấp: user1 chưa có quyền
      expect(await accessManager.hasRole(MINTER_ROLE, user1.address)).to.be.false;

      // Admin cấp quyền cho user1
      await accessManager.connect(admin).grantRole(MINTER_ROLE, user1.address);

      // Sau khi cấp: user1 đã có quyền
      expect(await accessManager.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("5. Người thường không thể tự cấp quyền cho người khác (phải bị Revert)", async function () {
      // user1 cố tình tự cấp quyền ADMIN cho user2
      // Lỗi do OpenZeppelin thiết kế: AccessControlUnauthorizedAccount
      await expectRevert(
        accessManager.connect(user1).grantRole(ADMIN_ROLE, user2.address),
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Thu hồi quyền (Revoke Role)", function () {
    beforeEach(async function () {
      // Setup trước: Admin cấp quyền VAULT cho user1
      await accessManager.connect(admin).grantRole(VAULT_ROLE, user1.address);
    });

    it("6. Admin có thể thu hồi quyền VAULT_ROLE của user1", async function () {
      // Kiểm tra user1 đã có quyền VAULT chưa
      expect(await accessManager.hasRole(VAULT_ROLE, user1.address)).to.be.true;

      // Admin thu hồi quyền
      await accessManager.connect(admin).revokeRole(VAULT_ROLE, user1.address);

      // Kiểm tra lại: user1 đã mất quyền
      expect(await accessManager.hasRole(VAULT_ROLE, user1.address)).to.be.false;
    });

    it("7. Người thường không thể thu hồi quyền của người khác", async function () {
      // user2 cố tình thu hồi quyền của user1
      await expectRevert(
        accessManager.connect(user2).revokeRole(VAULT_ROLE, user1.address),
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Từ bỏ quyền (Renounce Role)", function () {
    it("8. User có thể tự nguyện từ bỏ quyền của chính mình", async function () {
      // Admin cấp quyền MINTER cho user1
      await accessManager.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await accessManager.hasRole(MINTER_ROLE, user1.address)).to.be.true;

      // user1 không muốn làm MINTER nữa, tự từ bỏ quyền
      await accessManager.connect(user1).renounceRole(MINTER_ROLE, user1.address);

      // user1 đã mất quyền
      expect(await accessManager.hasRole(MINTER_ROLE, user1.address)).to.be.false;
    });
  });
});
