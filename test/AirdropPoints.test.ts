import { expect } from "chai";
import { describe, it, beforeEach } from "node:test";
import hre from "hardhat";

/**
 * @markdown
 * ### KỊCH BẢN KIỂM THỬ (UNIT TEST) CHO HỢP ĐỒNG AIRDROP POINTS
 * Các test cases được viết theo yêu cầu: Đảm bảo AddPoints, Revert Roles, Snapshot Increment & Data Immutability.
 * Sử dụng thư viện `chai` (expect) để kiểm tra các điều kiện.
 */
describe("Hợp đồng AirdropPoints", function () {
  let accessManager: any;
  let airdropPoints: any;
  let owner: any;
  let vaultMock: any;
  let user: any;
  let ethers: any;

  let VAULT_ROLE: any;
  let ADMIN_ROLE: any;

  // HELPER: Kiểm tra revert
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
    
    [owner, vaultMock, user] = await ethers.getSigners();

    // Deploy AccessManager (owner sẽ có ADMIN_ROLE)
    const AccessManagerFactory = await ethers.getContractFactory("AccessManager");
    accessManager = await AccessManagerFactory.deploy();

    // Deploy AirdropPoints (truyền AccessManager vào constructor)
    const AirdropPointsFactory = await ethers.getContractFactory("AirdropPoints");
    airdropPoints = await AirdropPointsFactory.deploy(await accessManager.getAddress());
    
    // Lấy các role hash
    VAULT_ROLE = await airdropPoints.VAULT_ROLE();
    ADMIN_ROLE = await airdropPoints.ADMIN_ROLE();
  });

  // Test Case 1: VAULT_ROLE addPoints thành công
  it("1. VAULT_ROLE addPoints thành công và cộng đúng điểm vào mapping", async function () {
    // Admin (owner) cấp quyền VAULT_ROLE cho tài khoản vaultMock trên AccessManager
    await accessManager.grantRole(VAULT_ROLE, vaultMock.address);
    
    const amount = 500n;
    const airdropPointsVault = airdropPoints.connect(vaultMock) as any;
    
    // vaultMock thực hiện gọi hàm cộng điểm cho user
    const tx = await airdropPointsVault.addPoints(user.address, amount);
    await tx.wait();

    // Lấy điểm hiện tại của user để kiểm tra
    const currentPoints = await airdropPointsVault.getCurrentPoints(user.address);
    expect(currentPoints).to.equal(amount);
  });

  // Test Case 2: Không có role → revert
  it("2. Không có role sẽ bị revert (từ chối truy cập)", async function () {
    const amount = 100n;
    
    // user bình thường gọi hàm addPoints sẽ văng lỗi (Revert)
    await expectRevert(
      airdropPoints.connect(user).addPoints(user.address, amount),
      "AirdropPoints: caller is not vault"
    );
  });

  // Test Case 3: addPoints với amount = 0 → revert
  it("3. addPoints với amount = 0 bị revert", async function () {
    await accessManager.grantRole(VAULT_ROLE, vaultMock.address);
    
    await expectRevert(
      airdropPoints.connect(vaultMock).addPoints(user.address, 0),
      "Amount must be > 0"
    );
  });

  // Test Case 4: Người thường gọi snapshot → revert
  it("4. Người thường không thể gọi snapshot", async function () {
    await expectRevert(
      airdropPoints.connect(user).snapshot(),
      "AirdropPoints: caller is not admin"
    );
  });

  // Test Case 5: snapshot tăng ID đúng
  it("5. Hàm snapshot tăng currentSnapshotId lên 1 đơn vị chuẩn xác", async function () {
    // Đọc ID ban đầu (lúc mới deploy là 0)
    const initialId = await airdropPoints.currentSnapshotId();
    expect(initialId).to.equal(0n);

    // Admin gọi snapshot
    const tx = await airdropPoints.snapshot();
    await tx.wait();

    // Kiểm tra ID mới đã tăng lên 1
    const newId = await airdropPoints.currentSnapshotId();
    expect(newId).to.equal(1n);
  });

  // Test Case 6: snapshot không làm thay đổi dữ liệu cũ (Immutability) & getPoints trả đúng giá trị
  it("6. Hàm snapshot không làm thay đổi dữ liệu cũ và getPoints trả đúng giá trị", async function () {
    // Cấp quyền VAULT trên AccessManager
    await accessManager.grantRole(VAULT_ROLE, vaultMock.address);
    
    const airdropPointsVault = airdropPoints.connect(vaultMock) as any;

    // Bước 1: Ở đợt 0 (Snapshot 0), cộng 1000 điểm cho user
    await (await airdropPointsVault.addPoints(user.address, 1000n)).wait();
    
    // Bước 2: Chốt sổ (tạo mốc snapshot mới -> nhảy sang đợt 1)
    await (await airdropPoints.snapshot()).wait();

    // Bước 3: Ở đợt 1, cộng thêm 500 điểm cho user
    await (await airdropPointsVault.addPoints(user.address, 500n)).wait();

    // BƯỚC KIỂM TRA (Verify)
    // - Dùng getPoints() tra cứu lại đợt 0 trong quá khứ -> Vẫn phải là 1000 (Immutability)
    const pointsEpoch0 = await airdropPoints.getPoints(user.address, 0);
    expect(pointsEpoch0).to.equal(1000n);

    // - Tra cứu đợt 1 hiện tại -> Phải là 500
    const pointsEpoch1 = await airdropPoints.getPoints(user.address, 1);
    expect(pointsEpoch1).to.equal(500n);
  });

  // Test Case 7: getCurrentPoints trả đúng
  it("7. getCurrentPoints trả đúng điểm đợt hiện tại", async function () {
    await accessManager.grantRole(VAULT_ROLE, vaultMock.address);

    // Ban đầu chưa cộng điểm → 0
    expect(await airdropPoints.getCurrentPoints(user.address)).to.equal(0n);

    // Cộng 200 điểm
    await airdropPoints.connect(vaultMock).addPoints(user.address, 200n);
    expect(await airdropPoints.getCurrentPoints(user.address)).to.equal(200n);
  });
});
