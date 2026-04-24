# BÁO CÁO PHẦN AIRDROP POINTS (Vinh)

## 1. Cơ chế tính điểm On-chain (Point Accounting)

Cơ chế điểm On-chain của dự án được triển khai thông qua smart contract `AirdropPoints.sol`. Hợp đồng đóng vai trò là sổ cái (ledger) chuyên biệt cho việc lưu trữ và cộng dồn điểm số của người dùng (user) trong quá trình tham gia hệ thống (chủ yếu thông qua hành động Stake tại `StakingVault`).

**Đặc điểm cốt lõi:**

- **Không nắm giữ Token:** Hợp đồng chỉ quản lý dữ liệu logic (mapping), không chứa tài sản thực tế.
- **Kế thừa AccessControl (OpenZeppelin):** Nâng cấp bảo mật bằng tiêu chuẩn công nghiệp OpenZeppelin. Chỉ hợp đồng `StakingVault` được gán quyền `VAULT_ROLE` mới được phép gọi hàm `addPoints()`.
- **Hiệu năng và Tối ưu Gas:** Hàm đọc `getPoints` và `getCurrentPoints` được thiết kế cực kỳ tối ưu (O(1) SLOAD), hoàn toàn miễn phí Gas khi truy vấn từ Frontend.
- **Xử lý Edge Cases:** Tối ưu hóa bằng cách chặn các giao dịch cộng 0 điểm (`require(amount > 0)`) để tránh spam mạng lưới và tiết kiệm Gas. Do sử dụng Solidity 0.8.20, hợp đồng tự động miễn nhiễm với lỗi tràn số (Overflow/Underflow).

## 2. 4 Bất biến hệ thống (System Invariants)

Thiết kế của `AirdropPoints` xoay quanh 4 bất biến toán học và logic để đảm bảo an toàn tuyệt đối cho quỹ Airdrop:

1. **Snapshot Immutability (Bất biến mốc thời gian):** Một khi đã chốt sổ, dữ liệu điểm số của đợt quá khứ bị đóng băng vĩnh viễn. Không một hàm nào trong hệ thống, kể cả Admin, có thể thay đổi dữ liệu của `snapshotId` cũ.
2. **Snapshot ID Monotonic Increase (ID tăng đơn điệu):** Mã đợt `currentSnapshotId` chỉ có thể tăng lên (`++`), không bao giờ giảm, loại bỏ hoàn toàn rủi ro ghi đè lịch sử (History Overwrite).
3. **Role-based Write Protection (Bảo vệ ghi bằng phân quyền):** Quá trình cập nhật trạng thái (State Mutation) được bảo vệ bằng các Modifier `onlyRole(VAULT_ROLE)` và `onlyRole(DEFAULT_ADMIN_ROLE)`.
4. **Isolation Between Epochs (Tính cô lập chu kỳ):** Sử dụng cấu trúc mapping 2 lớp `mapping(address => mapping(uint256 => uint256))` giúp điểm số giữa các đợt hoàn toàn độc lập, đợt mới bắt đầu với ô nhớ trống rỗng mà không cần tốn Gas chạy hàm reset.

## 3. Kiến trúc Luồng Tổng Thể (The Grand Workflow)

Dự án áp dụng chặt chẽ kiến trúc Separation of Concerns (Chia rẽ mối quan tâm) thông qua luồng liên kết các hợp đồng sau:

**User ➔ StakingVault ➔ addPoints() ➔ AirdropPoints ➔ snapshot() ➔ AirdropDistributor ➔ claim()**

- **Bước 1 (Tích lũy):** Người dùng nạp tiền vào `StakingVault`. Khi sinh lãi, `StakingVault` tự động gọi Cross-contract sang `AirdropPoints.addPoints(user, amount)`. Điểm được ghi vào đợt hiện hành.
- **Bước 2 (Chốt sổ):** Định kỳ, Admin gọi `AirdropPoints.snapshot()`. Biến `currentSnapshotId` nhảy số, khóa vĩnh viễn dữ liệu điểm của đợt cũ.
- **Bước 3 (Trả thưởng):** Người dùng truy cập `AirdropDistributor` gọi hàm `claim()`. Hợp đồng này gọi ngược về `AirdropPoints.getPoints(user, snapshotId)` để tra cứu điểm số đáng tin cậy. Dựa vào đó, nó rút token từ quỹ Treasury và trả về ví người dùng.

_Kiến trúc này giúp dự án có thể chia nhỏ Airdrop thành hàng trăm đợt (Multi-Epoch) mà không làm tăng độ phức tạp hệ thống._

## 4. Tự động hóa kiểm thử (Unit Testing)

Hợp đồng đã trải qua quá trình TDD (Test-Driven Development) nghiêm ngặt với bộ test viết bằng **Hardhat + Chai**.
Tất cả 5/5 kịch bản Unit Test đều vượt qua thành công:

1. Xác minh người Deploy được nhận quyền `DEFAULT_ADMIN_ROLE`.
2. Hợp đồng `StakingVault` (có quyền `VAULT_ROLE`) cộng điểm thành công.
3. Kẻ tấn công hoặc User không có quyền gọi `addPoints` bị chặn lập tức bằng mã lỗi `AccessControlUnauthorizedAccount`.
4. Hàm `snapshot()` tăng ID chuẩn xác.
5. Chứng minh tính Immutability: Tạo đợt 0 (1000 điểm) -> Snapshot -> Tạo đợt 1 (500 điểm). Hàm `getPoints` gọi lại quá khứ vẫn trả về đúng 1000 điểm không thay đổi.

## 5. Cấu trúc dự án

_(Bạn hãy mở thư mục dự án trên VSCode, sau đó chụp ảnh phần thanh cây thư mục Explorer dọc bên trái và chèn vào đây trong file Word)_

Dự án được phân chia theo tiêu chuẩn modular của Hardhat:

- **`contracts/core/`**: Cốt lõi hệ thống bao gồm Token gốc (`LaunchToken.sol`).
- **`contracts/features/`**: Nơi chứa các logic vận hành như Staking, Vesting, và On-chain Accounting (`AirdropPoints.sol`, `StakingVault.sol`).
- **`contracts/fund/`**: Kho quỹ tập trung (`Treasury.sol`).
- **`contracts/distribution/`**: Hệ thống phân phát cho User (`AirdropDistributor.sol`).
- **`test/`**: Tập hợp các kịch bản Unit Test đảm bảo độ phủ (coverage) an toàn cho từng file contract (`AirdropPoints.test.ts`).
