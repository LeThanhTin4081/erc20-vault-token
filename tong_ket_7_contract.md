# TỔNG QUAN HỆ THỐNG 7 SMART CONTRACT & KẾT QUẢ KIỂM THỬ

Tài liệu này tóm tắt lại toàn bộ khối lượng công việc, chức năng cốt lõi và kết quả kiểm thử của hệ thống 7 Smart Contract (Dự án VaultToken ERC-20).

---

## 1. KIẾN TRÚC HỆ THỐNG
Hệ thống được chia làm 4 module chính, tuân thủ chặt chẽ mô hình phân tán và tính bảo mật cao (RBAC):

1. **Tầng Core (Lõi):** Quản lý quyền hạn và nguồn cung Token.
2. **Tầng Features (Tính năng):** Các cơ chế tài chính như Khóa vốn (Vesting), Staking, và Ghi nhận điểm Airdrop.
3. **Tầng Fund (Quỹ):** Quản lý ngân khố an toàn.
4. **Tầng Distribution (Phân phối):** Thực thi trả thưởng cho người dùng.

---

## 2. CHI TIẾT 7 SMART CONTRACT

### 2.1. Lõi Hệ Thống (Core)
* **AccessManager.sol:** Trái tim của hệ thống phân quyền. Quản lý 3 vai trò chính (`ADMIN_ROLE`, `MINTER_ROLE`, `VAULT_ROLE`). Mọi contract khác đều gọi về đây để kiểm tra quyền truy cập.
* **LaunchToken.sol:** ERC-20 Token gốc (VLT). Tổng cung tối đa (Hard Cap) là 10.000.000 VLT. Tích hợp tính năng *Launch Gating* (chặn giao dịch trước khi ra mắt), *Pausable* (tạm dừng khẩn cấp), và *Auto-Burn* (tự động đốt khi giao dịch).

### 2.2. Tính Năng (Features)
* **TokenLocker.sol:** Hợp đồng khóa Token theo thời gian thực. Dành để khóa phần Token của Team hoặc các vòng Private Sale. Áp dụng chuẩn Checks-Effects-Interactions để chống rút trộm.
* **StakingVault.sol:** Người dùng khóa VLT vào đây để nhận lãi tĩnh dưới dạng Điểm Airdrop. Tích hợp chặt chẽ với cổng chặn Launch Gating (chưa Launch thì chưa được Stake).
* **AirdropPoints.sol:** Sổ cái lưu trữ điểm thưởng theo dạng Snapshot (chốt sổ từng đợt). Đảm bảo tính bất biến (immutability) của dữ liệu cũ, chỉ `VAULT_ROLE` mới có quyền cộng điểm.

### 2.3. Ngân Khố (Fund)
* **Treasury.sol:** Két sắt của dự án. Không chứa bất kỳ logic kinh doanh nào, chỉ làm nhiệm vụ giữ Token và cấp định mức (allowance) chi tiêu cho các hợp đồng phân phối. Chống lỗi Race-Condition khi thay đổi định mức chi tiêu.

### 2.4. Phân Phối (Distribution)
* **AirdropDistributor.sol:** Nơi người dùng vào bấm "Claim" lấy Token thật về ví. Contract sẽ đối chiếu điểm từ `AirdropPoints`, và rút tiền từ quỹ `Treasury` để trả thưởng. Tích hợp cơ chế chống nhận thưởng 2 lần (Double-Claim).

---

## 3. KẾT QUẢ KIỂM THỬ (UNIT TEST)

Hệ thống đã trải qua quá trình kiểm thử tự động khắt khe với **65 kịch bản (Test Cases)**. Kết quả: **100% PASS (65/65)**.

| Hợp đồng | Số lượng Test | Trọng tâm kiểm thử |
| :--- | :--- | :--- |
| **LaunchToken** | 12 tests | Hard Cap, Launch Gating, Pausable, Mint/Burn |
| **TokenLocker** | 12 tests | Logic khóa/mở khóa thời gian, Chặn mở khóa sớm |
| **StakingVault** | 10 tests | Tính lãi (pendingRewards), Khóa Stake trước Launch |
| **Treasury** | 10 tests | Bảo mật nạp/rút, chống Race-condition cho allowance |
| **AccessManager** | 8 tests | Cơ chế cấp/thu hồi/từ bỏ quyền hạn độc lập |
| **AirdropPoints** | 7 tests | Snapshot logic, Chặn sửa dữ liệu đợt cũ |
| **AirdropDistributor**| 6 tests | Tính toán tỷ lệ, Chống Double-Claim, Revert khi quỹ cạn |
| **Tổng cộng** | **65 tests** | Không dùng Mock, Test giả lập môi trường thực tế (Integration) |

---

## 4. TIÊU CHUẨN BẢO MẬT ĐÃ ÁP DỤNG
* **ReentrancyGuard:** Ngăn chặn tấn công vòng lặp (Reentrancy Attack) trên tất cả các hàm liên quan đến chuyển tiền (Stake, Unstake, Claim).
* **SafeERC20:** Tránh các lỗi xử lý khi tương tác với các đồng ERC-20 không chuẩn mực.
* **Kiểm soát Truy cập Tập trung (RBAC):** Không dùng `Ownable` đơn thuần, giúp giảm thiểu rủi ro bị lộ khóa cá nhân của một Admin duy nhất.
* **Chống Race Condition:** Reset allowance về `0` trước khi cấp hạn mức mới.
