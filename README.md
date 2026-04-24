# 1. Tổng quan hệ thống

Hệ thống được thiết kế theo kiến trúc modular, tách biệt rõ các layer:

- Core: quản lý token và quyền truy cập
- Feature: staking, locking, tích điểm
- Fund: quản lý tài sản (Treasury)
- Distribution: phân phối phần thưởng (Airdrop)

Mục tiêu:

- Tách biệt logic và tài sản
- Giảm coupling giữa các contract
- Dễ audit và mở rộng

---

# 2. Danh sách contract và chức năng

## 2.1 LaunchToken

Chức năng:

- Triển khai token chuẩn ERC20
- Kiểm soát thời điểm mở giao dịch
- Hỗ trợ mint và burn

Đặc điểm:

- mint chỉ dành cho MINTER_ROLE
- burn cho phép user tự thực hiện
- openTrading cho phép admin kích hoạt hệ thống
- chỉ cho phép transfer sau khi hệ thống được launch
- hỗ trợ cơ chế burnRate (auto burn khi transfer nếu cần)

---

## 2.2 AccessManager

Chức năng:

- Quản lý role toàn hệ thống

Đặc điểm:

- Sử dụng RBAC (Role-Based Access Control)
- Các role chính: ADMIN_ROLE, MINTER_ROLE, VAULT_ROLE
- grantRole và revokeRole chỉ do admin thực hiện
- Các contract khác query quyền thông qua AccessManager

---

## 2.3 TokenLocker

Chức năng:

- Khóa token theo thời gian

Đặc điểm:

- Mỗi user có thể có nhiều lock
- lock(amount, duration) chỉ hoạt động sau launch
- unlock(lockId) cho phép rút token sau khi hết thời gian khóa
- Không liên quan đến reward hoặc staking

---

## 2.4 StakingVault

Chức năng:

- Cho phép user stake token và nhận reward

Đặc điểm:

- Sử dụng mô hình accRewardPerToken để tính reward chính xác
- Có biến ACC_REWARD_PRECISION để tránh mất độ chính xác
- stake: gửi token vào vault
- unstake: rút token và cập nhật reward
- claimRewards: nhận reward
- emergencyWithdraw: rút toàn bộ vốn, bỏ qua reward
- Sau mỗi hành động stake, hệ thống cập nhật điểm vào AirdropPoints

---

## 2.5 AirdropPoints

Chức năng:

- Ghi nhận điểm của user phục vụ airdrop

Đặc điểm:

- Không giữ token, chỉ làm accounting
- addPoints chỉ được gọi bởi contract có VAULT_ROLE
- snapshot tạo mốc thời gian (epoch) cho airdrop
- snapshotId dùng để phân biệt các đợt airdrop
- getPoints(user, snapshotId) trả về điểm tại thời điểm snapshot

---

## 2.6 Treasury

Chức năng:

- Quản lý toàn bộ quỹ token của hệ thống

Đặc điểm:

- deposit để nạp token vào hệ thống
- withdraw chỉ dành cho admin
- approveSpender cấp allowance cho contract phân phối (Distributor)
- Không chứa logic airdrop hoặc staking
- Đóng vai trò “két tiền”

---

## 2.7 AirdropDistributor

Chức năng:

- Phân phối token airdrop cho user

Đặc điểm:

- claim:
    - đọc điểm từ AirdropPoints theo snapshot
    - kiểm tra user đã claim chưa
    - tính reward
    - gọi transferFrom từ Treasury
- sử dụng mapping claimed[snapshotId][user] để chống double claim
- calculateReward là hàm view để tính reward
- sử dụng ReentrancyGuard để chống tấn công

---

# 3. Luồng hoạt động chính

1. Admin mint token thông qua LaunchToken
2. Admin gọi openTrading để mở hệ thống
3. User stake token vào StakingVault
4. StakingVault cập nhật điểm vào AirdropPoints
5. Admin gọi snapshot để фикс điểm tại một thời điểm
6. Admin nạp token vào Treasury
7. Admin cấp allowance cho AirdropDistributor
8. User gọi claim tại AirdropDistributor
9. Distributor lấy token từ Treasury và chuyển cho user

---

# 4. Cơ chế bảo mật

- ReentrancyGuard:
    - áp dụng cho StakingVault và AirdropDistributor
- Pausable:
    - áp dụng cho LaunchToken (có thể mở rộng)
- RBAC:
    - kiểm soát toàn bộ quyền thông qua AccessManager
- Allowance control:
    - Treasury chỉ cấp quyền cho Distributor
- Snapshot isolation:
    - mỗi đợt airdrop độc lập theo snapshotId

---

# 5. Các ràng buộc hệ thống (Invariants)

- Một user chỉ được claim một lần trên mỗi snapshot
- Tổng reward claim không được vượt quá số dư Treasury
- Không được phép stake, lock hoặc transfer trước khi launch
- emergencyWithdraw phải reset trạng thái reward
- Allowance phải được quản lý an toàn, tránh race condition

---

# 6. Rủi ro và hướng xử lý

- Double claim:
    - sử dụng mapping theo snapshotId
- Thiếu thanh khoản trong Treasury:
    - kiểm tra balance trước khi transfer
- Race condition khi approve:
    - sử dụng increaseAllowance hoặc reset về 0 trước
- Reentrancy:
    - sử dụng ReentrancyGuard
- Admin abuse:
    - khuyến nghị dùng multisig hoặc timelock

---

# 7. Kết luận

Hệ thống đạt các tiêu chí:

- Tách biệt rõ ràng giữa logic và tài sản
- Kiến trúc modular, dễ mở rộng
- Phù hợp với các pattern phổ biến trong DeFi
- Có thể audit và triển khai thực tế

Các bước tiếp theo để production:

- Bổ sung test (unit + integration)
- Áp dụng multisig và timelock cho admin
- Audit bảo mật trước khi deploy mainnet
