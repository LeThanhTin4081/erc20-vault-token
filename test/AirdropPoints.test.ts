import { expect } from "chai";
import { ethers } from "ethers";
import { describe, it, beforeEach } from "node:test";
import fs from "fs";
import path from "path";

/**
 * @markdown
 * ### KỊCH BẢN KIỂM THỬ (UNIT TEST) CHO HỢP ĐỒNG AIRDROP POINTS
 * Các test cases được viết theo yêu cầu: Đảm bảo AddPoints, Revert Roles, Snapshot Increment & Data Immutability.
 * Sử dụng thư viện `chai` (expect) để kiểm tra các điều kiện.
 */
describe("Hợp đồng AirdropPoints", function () {
  let airdropPoints: any;
  let owner: ethers.Signer;
  let vaultMock: ethers.Signer;
  let user: ethers.Signer;
  
  // Dùng ethers để băm chuỗi "VAULT_ROLE" thay vì ghi cứng mã hash
  const VAULT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_ROLE"));

  beforeEach(async function () {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const signers = await provider.listAccounts();
    owner = await provider.getSigner(signers[0].address);
    vaultMock = await provider.getSigner(signers[1].address);
    user = await provider.getSigner(signers[2].address);

    const airdropPointsArtifactPath = path.resolve(process.cwd(), "artifacts/contracts/features/AirdropPoints.sol/AirdropPoints.json");
    const airdropPointsArtifact = JSON.parse(fs.readFileSync(airdropPointsArtifactPath, "utf-8"));

    const AirdropPointsFactory = new ethers.ContractFactory(airdropPointsArtifact.abi, airdropPointsArtifact.bytecode, owner);
    airdropPoints = await AirdropPointsFactory.deploy();
    await airdropPoints.waitForDeployment();
  });

  // Test Case 1: VAULT_ROLE addPoints thành công
  it("VAULT_ROLE addPoints thành công và cộng đúng điểm vào mapping", async function () {
    // Admin (owner) cấp quyền VAULT_ROLE cho tài khoản vaultMock
    const grantTx = await airdropPoints.grantRole(VAULT_ROLE, vaultMock.address);
    await grantTx.wait(); // Chờ giao dịch cấp quyền được ghi vào block
    
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
  it("Không có role sẽ bị revert (từ chối truy cập)", async function () {
    const amount = 100n;
    const airdropPointsUser = airdropPoints.connect(user) as any;
    
    // user bình thường gọi hàm addPoints sẽ văng lỗi (Revert)
    let errorOccurred = false;
    try {
      await airdropPointsUser.addPoints(user.address, amount);
    } catch (e: any) {
      errorOccurred = true;
      expect(e.message).to.match(/AccessControlUnauthorizedAccount|unknown custom error|execution reverted/);
    }
    expect(errorOccurred).to.be.true;
  });

  // Test Case 3: snapshot tăng ID đúng
  it("Hàm snapshot tăng currentSnapshotId lên 1 đơn vị chuẩn xác", async function () {
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

  // Test Case 4: snapshot không làm thay đổi dữ liệu cũ (Immutability) & Test Case 5: getPoints trả đúng giá trị
  it("Hàm snapshot không làm thay đổi dữ liệu cũ và getPoints trả đúng giá trị", async function () {
    // Cấp quyền VAULT
    const grantTx = await airdropPoints.grantRole(VAULT_ROLE, vaultMock.address);
    await grantTx.wait();
    
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
});
