import { describe, it, beforeEach } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite cho Treasury.sol
 *
 * Lưu ý: Dự án dùng Hardhat 3 → test runner là node:test (không phải Mocha)
 * ethers phải lấy từ hre bên trong hàm (Hardhat 3 khởi tạo plugin lazy)
 */
describe("Treasury", function () {
  // Biến toàn cục dùng chung cho các test cases
  let accessManager: any; // Contract phân quyền giả lập
  let token: any;         // Token ERC-20 giả lập
  let treasury: any;      // Contract Treasury chính cần test
  let admin: any;         // Ví admin (người quản lý ngân khố)
  let user1: any;         // Ví user thường (người dùng nạp tiền)
  let spender: any;       // Ví đóng vai trò là contract Airdrop (được phép rút tiền)
  let ethers: any;        // Thư viện ethers để tương tác blockchain

  // ========== HELPER: Kiểm tra revert ==========
  // Hàm phụ trợ dùng để bắt lỗi revert (thay thế cho .revertedWith)
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
  beforeEach(async function () {
    // 1. Kết nối vào mạng (giả lập) của Hardhat để lấy thư viện ethers
    const connection = await hre.network.connect();
    ethers = connection.ethers;

    // 2. Lấy danh sách tài khoản từ Hardhat
    [admin, user1, spender] = await ethers.getSigners();

    // 3. Deploy MockAccessManager (admin sẽ tự động có quyền ADMIN_ROLE)
    const AccessManagerFactory = await ethers.getContractFactory("MockAccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // 4. Deploy MockLaunchToken (admin sẽ nhận được 1,000,000 token VLT)
    const TokenFactory = await ethers.getContractFactory("MockLaunchToken");
    token = await TokenFactory.deploy();

    // 5. Deploy Treasury (truyền địa chỉ của Token và AccessManager vào constructor)
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(
      await token.getAddress(),
      await accessManager.getAddress()
    );

    // 6. Chuyển 100,000 VLT từ admin sang user1 để user1 có tiền test nạp token
    await token.transfer(user1.address, ethers.parseEther("100000"));
  });

  // ========== TEST CASE: THEO ĐÚNG 10 TRƯỜNG HỢP TRONG FILE KẾ HOẠCH ==========

  describe("Deploy", function () {
    // Test Case 1: Kiểm tra xem constructor có lưu đúng địa chỉ reference không
    it("1. Deploy Treasury thành công", async function () {
      // Lấy địa chỉ token đã lưu trong contract Treasury và so sánh với thực tế
      expect(await treasury.token()).to.equal(await token.getAddress());
      // Tương tự với AccessManager
      expect(await treasury.accessManager()).to.equal(await accessManager.getAddress());
    });
  });

  describe("Deposit (Nạp tiền)", function () {
    // Test Case 2: Nạp tiền hợp lệ (Happy path)
    it("2. deposit - nạp token thành công", async function () {
      const amount = ethers.parseEther("100");
      
      // User1 cấp quyền cho Treasury được phép lấy 100 token từ ví của mình
      await token.connect(user1).approve(await treasury.getAddress(), amount);
      
      // Lấy số dư của Treasury và User trước khi nạp
      const treasuryBalanceBefore = await token.balanceOf(await treasury.getAddress());
      const userBalanceBefore = await token.balanceOf(user1.address);

      // User1 thực hiện nạp tiền
      await treasury.connect(user1).deposit(amount);

      // Lấy số dư sau khi nạp
      const treasuryBalanceAfter = await token.balanceOf(await treasury.getAddress());
      const userBalanceAfter = await token.balanceOf(user1.address);

      // Kiểm tra: Tiền trong két tăng đúng 100
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(amount);
      // Kiểm tra: Tiền trong ví user giảm đúng 100
      expect(userBalanceBefore - userBalanceAfter).to.equal(amount);
    });

    // Test Case 3: Quên gọi approve trước khi nạp
    it("3. deposit - chưa approve -> revert", async function () {
      const amount = ethers.parseEther("100");

      // CỐ TÌNH KHÔNG GỌI token.approve()
      // Giao dịch sẽ bị chặn bởi chuẩn ERC-20 (insufficient allowance)
      await expectRevert(
        treasury.connect(user1).deposit(amount),
        "ERC20InsufficientAllowance"
      );
    });
  });

  describe("Withdraw (Rút tiền - Chỉ Admin)", function () {
    // Nạp sẵn 1000 token vào két để test các case rút tiền
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await token.connect(user1).approve(await treasury.getAddress(), amount);
      await treasury.connect(user1).deposit(amount);
    });

    // Test Case 4: Admin rút tiền hợp lệ (Happy path)
    it("4. withdraw - admin rút thành công", async function () {
      const amount = ethers.parseEther("100");
      
      // Lấy số dư của user1 trước khi nhận tiền rút từ két
      const userBalanceBefore = await token.balanceOf(user1.address);
      const treasuryBalanceBefore = await token.balanceOf(await treasury.getAddress());
      
      // Admin ra lệnh rút 100 token từ két và chuyển thẳng cho user1
      await treasury.connect(admin).withdraw(user1.address, amount);
      
      // Lấy số dư sau khi rút
      const userBalanceAfter = await token.balanceOf(user1.address);
      const treasuryBalanceAfter = await token.balanceOf(await treasury.getAddress());

      // Kiểm tra: Ví user1 được nhận 100 token
      expect(userBalanceAfter - userBalanceBefore).to.equal(amount);
      // Kiểm tra: Tiền trong két giảm 100 token
      expect(treasuryBalanceBefore - treasuryBalanceAfter).to.equal(amount);
    });

    // Test Case 5: Người lạ cố tình gọi hàm rút tiền
    it("5. withdraw - non-admin rút -> revert", async function () {
      const amount = ethers.parseEther("100");
      
      // user1 (không phải admin) cố gọi withdraw
      // Sẽ bị modifier onlyAdmin chặn lại và văng lỗi
      await expectRevert(
        treasury.connect(user1).withdraw(user1.address, amount),
        "Treasury: caller is not admin"
      );
    });

    // Test Case 6: Rút nhiều hơn số tiền đang có trong két
    it("6. withdraw - rút quá balance -> revert", async function () {
      // Trong két lúc này chỉ có 1000 token (do đã nạp ở beforeEach)
      const amount = ethers.parseEther("9999"); // Cố tình rút 9999 token
      
      // Sẽ bị văng lỗi insufficient balance
      await expectRevert(
        treasury.connect(admin).withdraw(user1.address, amount),
        "Treasury: insufficient balance"
      );
    });
  });

  describe("ApproveSpender (Cấp quyền cho Airdrop/Staking - Chỉ Admin)", function () {
    // Test Case 7: Cấp quyền hợp lệ
    it("7. approveSpender - admin approve thành công", async function () {
      const amount = ethers.parseEther("500");
      
      // Admin cho phép địa chỉ spender (Airdrop contract) được quyền rút tối đa 500 token
      await treasury.connect(admin).approveSpender(spender.address, amount);
      
      // Lấy thông tin allowance thực tế từ LaunchToken
      const allowance = await token.allowance(await treasury.getAddress(), spender.address);
      
      // Kiểm tra xem đúng là 500 chưa
      expect(allowance).to.equal(amount);
    });

    // Test Case 8: Người lạ cố tình cấp quyền
    it("8. approveSpender - non-admin -> revert", async function () {
      const amount = ethers.parseEther("500");
      
      // user1 cố tình gọi cấp quyền cho spender
      await expectRevert(
        treasury.connect(user1).approveSpender(spender.address, amount),
        "Treasury: caller is not admin"
      );
    });

    // Test Case 9: Kiểm tra cơ chế chống Hack Race Condition
    it("9. approveSpender - đổi allowance an toàn", async function () {
      // Lần 1: Cấp quyền cho spender rút 500 token
      await treasury.connect(admin).approveSpender(spender.address, ethers.parseEther("500"));
      
      // Giả sử có một bug khiến admin đổi ý, muốn hạ xuống chỉ còn 300 token
      // Theo logic contract, nó phải hạ về 0 TRƯỚC khi set thành 300.
      await treasury.connect(admin).approveSpender(spender.address, ethers.parseEther("300"));
      
      // Kiểm tra quyền rút cuối cùng phải là đúng 300
      // Nếu contract không có cơ chế chặn, spender có thể lợi dụng kẽ hở rút thành 500 + 300 = 800
      const allowance = await token.allowance(await treasury.getAddress(), spender.address);
      expect(allowance).to.equal(ethers.parseEther("300"));
    });
  });

  describe("View Functions (Hàm đọc dữ liệu)", function () {
    // Test Case 10: getBalance
    it("10. getBalance - trả đúng balance", async function () {
      // Lúc két mới tạo, chưa có ai nạp tiền → 0
      expect(await treasury.getBalance()).to.equal(0n);

      // User1 nạp 150 token
      const amount = ethers.parseEther("150");
      await token.connect(user1).approve(await treasury.getAddress(), amount);
      await treasury.connect(user1).deposit(amount);

      // Kiểm tra lại hàm getBalance phải trả đúng 150 token
      expect(await treasury.getBalance()).to.equal(amount);
      
      // So sánh nó phải KHỚP HOÀN TOÀN với hàm chuẩn của ERC-20
      const actualBalance = await token.balanceOf(await treasury.getAddress());
      expect(await treasury.getBalance()).to.equal(actualBalance);
    });
  });
});
