import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite cho TokenLocker.sol
 *
 * Lưu ý: Dự án dùng Hardhat 3 → test runner là node:test (không phải Mocha)
 * ethers phải lấy từ hre bên trong hàm (Hardhat 3 khởi tạo plugin lazy)
 */
describe("TokenLocker", function () {
  // Biến toàn cục dùng chung cho các test cases
  let accessManager: any; // Contract phân quyền giả lập
  let token: any;         // Token ERC-20 giả lập
  let locker: any;        // Contract TokenLocker chính cần test
  let admin: any;         // Ví admin (người deploy)
  let user1: any;         // Ví user thường để test lock/unlock
  let ethers: any;        // Thư viện ethers để tương tác blockchain

  // ========== HELPER: Kiểm tra revert ==========
  // Hàm phụ trợ dùng để bắt lỗi revert (thay thế cho .revertedWith)
  // Lý do: Hardhat 3 + Viem không tích hợp sẵn hardhat-chai-matchers
  async function expectRevert(promise: Promise<any>, expectedError: string) {
    try {
      await promise; // Nếu giao dịch thành công → test thất bại vì ta đang mong nó revert
      expect.fail(`Expected transaction to revert with: ${expectedError}`);
    } catch (error: any) {
      // Nếu có lỗi, kiểm tra xem nội dung lỗi có chứa dòng chữ ta mong đợi không
      expect(error.message).to.include(expectedError);
    }
  }

  // ========== SETUP ==========
  // beforeEach: Chạy đoạn code này TRƯỚC MỖI test case (it)
  // Đảm bảo mỗi test chạy trên một môi trường mới tinh, không bị ảnh hưởng bởi test trước
  beforeEach(async function () {
    // 1. Kết nối vào mạng (giả lập) của Hardhat để lấy thư viện ethers
    const connection = await hre.network.connect();
    ethers = connection.ethers;

    // 2. Lấy 2 tài khoản đầu tiên từ Hardhat (có sẵn 10000 ETH ảo làm phí gas)
    [admin, user1] = await ethers.getSigners();

    // 3. Deploy AccessManager thật (admin sẽ tự động có quyền ADMIN_ROLE)
    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // 4. Deploy LaunchToken thật (admin sẽ nhận được 1,000,000 token VLT)
    const TokenFactory = await ethers.getContractFactory("LaunchToken");
    token = await TokenFactory.deploy(await accessManager.getAddress());

    // 5. Deploy TokenLocker (truyền địa chỉ của Token và AccessManager vào constructor)
    const LockerFactory = await ethers.getContractFactory("TokenLocker");
    locker = await LockerFactory.deploy(
      await token.getAddress(),
      await accessManager.getAddress()
    );

    // 6. Chuyển 10,000 VLT từ admin sang user1 để user1 có tiền test khóa token
    await token.transfer(user1.address, ethers.parseEther("10000"));
  });

  // ========== TEST CASE: THEO ĐÚNG 12 TRƯỜNG HỢP TRONG FILE KẾ HOẠCH ==========

  describe("Deploy", function () {
    // Test Case 1: Kiểm tra xem constructor có lưu đúng địa chỉ reference không
    it("1. Deploy TokenLocker thành công (lưu đúng address)", async function () {
      // Lấy địa chỉ token đã lưu trong contract Locker và so sánh với thực tế
      expect(await locker.token()).to.equal(await token.getAddress());
      // Tương tự với AccessManager
      expect(await locker.accessManager()).to.equal(await accessManager.getAddress());
    });
  });

  describe("Lock", function () {
    // Test Case 2: Cố tình lock khi hệ thống chưa open trading
    it("2. lock - trước khi launch -> revert", async function () {
      const amount = ethers.parseEther("100"); // 100 token
      
      // User1 cấp quyền cho Locker được phép rút 100 token của mình
      await token.connect(user1).approve(await locker.getAddress(), amount);

      // Cố gắng lock, kỳ vọng sẽ bị văng lỗi "system not launched yet"
      await expectRevert(
        locker.connect(user1).lock(amount, 60),
        "TokenLocker: system not launched yet"
      );
    });

    // Test Case 3: Chức năng khóa cốt lõi (Happy path)
    it("3. lock - sau launch, thành công", async function () {
      // Admin mở hệ thống trước
      await token.openTrading();

      const amount = ethers.parseEther("100");
      
      // User1 cấp quyền cho Locker
      await token.connect(user1).approve(await locker.getAddress(), amount);
      
      // Lấy số dư của locker trước khi khóa
      const lockerBalanceBefore = await token.balanceOf(await locker.getAddress());
      
      // User1 thực hiện khóa 100 token trong 60 giây
      await locker.connect(user1).lock(amount, 60);

      // Kiểm tra: token thực sự đã chuyển từ user1 vào Locker chưa?
      const lockerBalanceAfter = await token.balanceOf(await locker.getAddress());
      expect(lockerBalanceAfter - lockerBalanceBefore).to.equal(amount);
    });

    // Test Case 4: Khóa số lượng bằng 0 (Vô lý)
    it("4. lock - amount = 0 -> revert", async function () {
      await token.openTrading(); // Mở hệ thống
      
      // Khóa 0 token, kỳ vọng văng lỗi "amount must be > 0"
      await expectRevert(
        locker.connect(user1).lock(0, 60),
        "TokenLocker: amount must be > 0"
      );
    });

    // Test Case 5: Quên gọi approve trước khi lock
    it("5. lock - chưa approve -> revert", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("100");

      // CỐ TÌNH KHÔNG GỌI token.approve()
      // Giao dịch sẽ bị chặn bởi chuẩn ERC-20 (insufficient allowance)
      await expectRevert(
        locker.connect(user1).lock(amount, 60),
        "ERC20InsufficientAllowance"
      );
    });

    // Test Case 6: Một người có thể tạo nhiều khoản khóa khác nhau
    it("6. lock - nhiều lock cho 1 user", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("100");

      // Cấp quyền tổng cộng 200 token
      await token.connect(user1).approve(await locker.getAddress(), ethers.parseEther("200"));
      
      // Tạo lock thứ 1 (lockId = 0)
      await locker.connect(user1).lock(amount, 60);
      // Tạo lock thứ 2 (lockId = 1)
      await locker.connect(user1).lock(amount, 120);

      // Xác nhận user có chính xác 2 lock
      expect(await locker.getLockCount(user1.address)).to.equal(2n);
    });
  });

  describe("Unlock", function () {
    // Test Case 7: Rút token khi chưa đến hạn
    it("7. unlock - trước thời hạn -> revert", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("100");

      // Setup: khóa token trong 3600 giây (1 giờ)
      await token.connect(user1).approve(await locker.getAddress(), amount);
      await locker.connect(user1).lock(amount, 3600);

      // Cố tình rút ngay lập tức → kỳ vọng báo lỗi "not yet unlocked"
      await expectRevert(
        locker.connect(user1).unlock(0),
        "TokenLocker: not yet unlocked"
      );
    });

    // Test Case 8: Rút token hợp lệ (Happy path)
    it("8. unlock - đúng thời hạn, thành công", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("100");

      // Setup: khóa token
      await token.connect(user1).approve(await locker.getAddress(), amount);
      await locker.connect(user1).lock(amount, 3600);

      const balanceBefore = await token.balanceOf(user1.address);

      // XÀI CHIÊU: Giả lập tua nhanh thời gian của blockchain lên 3600 giây
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []); // Tạo 1 block mới để ghi nhận thời gian

      // Gọi unlock (chắc chắn thành công vì đã hết hạn)
      await locker.connect(user1).unlock(0);

      // Kiểm tra: tiền đã về lại ví user chưa?
      const balanceAfter = await token.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    // Test Case 9: Chống hack rút tiền 2 lần
    it("9. unlock - 2 lần cùng lockId -> revert", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("100");

      await token.connect(user1).approve(await locker.getAddress(), amount);
      await locker.connect(user1).lock(amount, 60);

      // Tua nhanh thời gian cho đáo hạn
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      // Lần 1: rút tiền thành công
      await locker.connect(user1).unlock(0);

      // Lần 2: tham lam rút tiếp cùng 1 mã lockId → văng lỗi "already released"
      await expectRevert(
        locker.connect(user1).unlock(0),
        "TokenLocker: already released"
      );
    });

    // Test Case 10: Rút mã lockId bậy bạ
    it("10. unlock - lockId không tồn tại -> revert", async function () {
      // User không hề có lock nào mà cố rút lock thứ 999
      await expectRevert(
        locker.connect(user1).unlock(999),
        "TokenLocker: invalid lockId"
      );
    });
  });

  describe("View Functions (Hàm đọc dữ liệu)", function () {
    // Test Case 11: getLockCount
    it("11. getLockCount - trả đúng số lượng", async function () {
      await token.openTrading();
      
      // Đầu tiên user chưa khóa gì → 0
      expect(await locker.getLockCount(user1.address)).to.equal(0n);

      const amount = ethers.parseEther("10");
      await token.connect(user1).approve(await locker.getAddress(), ethers.parseEther("30"));
      
      // Tạo 3 lock liên tiếp
      await locker.connect(user1).lock(amount, 60);
      await locker.connect(user1).lock(amount, 60);
      await locker.connect(user1).lock(amount, 60);

      // Kiểm tra hàm đếm phải trả về 3
      expect(await locker.getLockCount(user1.address)).to.equal(3n);
    });

    // Test Case 12: getLockInfo
    it("12. getLockInfo - trả đúng thông tin", async function () {
      await token.openTrading();
      const amount = ethers.parseEther("555");
      const duration = 1000; // 1000 giây

      await token.connect(user1).approve(await locker.getAddress(), amount);
      
      // Lấy thời gian blockchain hiện tại
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;

      // Thực hiện khóa
      await locker.connect(user1).lock(amount, duration);

      // Gọi getLockInfo để lấy thông tin của lockId 0
      const [lockAmount, unlockTime, isReleased] = await locker.getLockInfo(user1.address, 0);
      
      // Kỳ vọng: số lượng token đúng
      expect(lockAmount).to.equal(amount);
      // Kỳ vọng: thời gian mở khóa = thời gian tạo + duration (sai số cho phép 1-2 giây tùy block)
      // Lưu ý: Chai's closeTo dùng Number, nên phải ép kiểu từ BigInt sang Number
      expect(Number(unlockTime)).to.be.closeTo(Number(timestampBefore) + duration, 5);
      // Kỳ vọng: chưa rút nên isReleased = false
      expect(isReleased).to.equal(false);
    });
  });
});
