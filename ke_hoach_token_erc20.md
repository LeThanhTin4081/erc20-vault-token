# DỰ ÁN: Thiết kế và triển khai hệ thống Token ERC-20 với cơ chế quản trị và DeFi Ecosystem

## Thông tin dự án

- **Đề tài:** Thiết kế và triển khai hệ thống Token ERC-20 kết hợp Staking, Airdrop và Quản trị nền tảng Blockchain Ethereum
- **Mạng:** Ethereum Sepolia (Testnet)
- **Số lượng contract:** 7
- **Team:** 4 người
- **Công nghệ chính:** Solidity, Hardhat, OpenZeppelin, Viem, MetaMask

---

## PHẦN 1: THIẾT KẾ TOKEN (TOKENOMICS)

### 1. Chọn tên & danh tính Token

| Thông số | Giá trị | Giải thích |
|----------|---------|------------|
| **Tên đầy đủ** | VaultToken | Tên hiển thị trên ví, sàn giao dịch |
| **Ký hiệu (Symbol)** | VLT | Viết tắt 3-5 ký tự (giống USDT, BTC, ETH) |
| **Decimals** | 18 | 1 VLT = 10^18 đơn vị nhỏ nhất (chuẩn ERC-20) |
| **Mạng** | Ethereum Sepolia | Testnet miễn phí |

> **Mẹo đặt tên token:**
> - Tên ngắn gọn, dễ nhớ (3-5 ký tự symbol)
> - Không trùng token nổi tiếng (USDT, BTC, ETH, BNB)
> - Symbol nên viết HOA hết
> - Ví dụ: VLT, MYT, TEAM, EDU, DAPP...
> - Nhóm có thể đổi tên theo ý thích, chỉ cần sửa trong constructor

### 2. Tổng cung (Supply Model)

```text
┌─────────────────────────────────────────────────────┐
│              MÔ HÌNH TỔNG CUNG VLT                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tổng cung ban đầu (Initial Supply):                │
│  ████████████░░░░░░░░░░░░░░░░░░  1,000,000 VLT     │
│                                                     │
│  Tổng cung tối đa (Max Supply / Cap):               │
│  ██████████████████████████████  10,000,000 VLT     │
│                                                     │
│  → Minter có thể mint thêm 9,000,000 VLT nữa      │
│  → Khi đạt 10M → KHÔNG THỂ mint thêm              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

| Thông số | Giá trị | Ý nghĩa |
|----------|---------|---------|
| **Initial Supply** | 1,000,000 VLT | Số token tạo ra khi deploy, cấp cho admin |
| **Max Supply (Cap)** | 10,000,000 VLT | Giới hạn tuyệt đối, code cứng không ai sửa được |
| **Mintable** | Có (trong giới hạn cap) | Minter role có thể in thêm khi cần |
| **Burnable** | Có | Ai cũng có thể đốt token của mình → giảm tổng cung |

### 3. Phân bổ Token (Token Distribution)

```text
┌──────────────────────────────────────────────────────┐
│         PHÂN BỔ 1,000,000 VLT BAN ĐẦU               │
│                                                      │
│  ████████████████      30%  =  300,000 VLT           │
│  │ Quỹ phát triển (Team)                             │
│  │ → Khóa 6 tháng (180 ngày), sau đó mới rút được   │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Bán công khai (Public Sale)                       │
│  │ → Nạp vào ví vận hành hoặc dùng tạo thanh khoản   │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Quỹ gọi vốn (Seed / Series A)                     │
│  │ → Phân bổ cho nhà đầu tư chiến lược               │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Cộng đồng (Community / Airdrop)                   │
│  │ → Chuyển vào Treasury để phát thưởng cho người dùng│
│                                                      │
│  █████                 10%  =  100,000 VLT           │
│  │ Quỹ dự phòng (Reserve)                            │
│  │ → Admin giữ, dùng khi khẩn cấp                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| Phần | % | Số lượng | Khóa | Mục đích |
|------|---|----------|------|----------|
| 🏗️ Team/Dev | 30% | 300,000 VLT | Khóa 180 ngày | Trả thưởng cho team phát triển |
| 🛒 Public Sale | 20% | 200,000 VLT | Không khóa | Bán ra thị trường |
| 💼 Quỹ gọi vốn | 20% | 200,000 VLT | Theo thỏa thuận | Bán cho quỹ đầu tư chiến lược |
| 🎁 Community | 20% | 200,000 VLT | Không khóa | Airdrop, thưởng hệ sinh thái qua Staking |
| 🏦 Reserve | 10% | 100,000 VLT | Không khóa | Admin giữ dự phòng |

### 4. Cơ chế khóa Token (TokenLocker / Vesting)

**Tại sao phải khóa?**
- Tránh team bán hết token ngay → mất giá
- Tạo niềm tin cho nhà đầu tư
- Giống các dự án crypto thật (team luôn bị khóa 6-24 tháng)

**Quy tắc khóa trong dự án (thông qua TokenLocker):**

| Quỹ | Số lượng | Thời gian khóa | Cách mở |
|-----|----------|-----------------|---------|
| Team/Dev | 300,000 VLT | 180 ngày (6 tháng) | Gọi `unlock()` sau 180 ngày |
| Ví dụ demo | Tùy chọn | 60 giây (để test nhanh) | Gọi `unlock()` sau 60s |

**Flow khóa token:**
1. Admin deploy LaunchToken → nhận 1,000,000 VLT
2. Admin approve 300,000 VLT cho TokenLocker contract
3. Admin gọi `lock(amount, duration)` → token bị khóa
4. Trước 180 ngày → gọi `unlock()` → ❌ REVERT
5. Sau 180 ngày → gọi `unlock()` → ✅ nhận lại token

### 5. Cơ chế phân phối Token (Staking & Airdrop)

- **StakingVault.sol:** Cho phép user stake token và cập nhật điểm.
- **AirdropPoints.sol:** Ghi nhận điểm thưởng của user, phục vụ phân phối airdrop sau này.
- **Treasury.sol & AirdropDistributor.sol:** Ngân quỹ giữ 20% lượng token cộng đồng và chịu trách nhiệm phân phối khi người dùng claim.

### 6. Quyền Admin & Quản trị (AccessManager)

```text
┌────────────────────────────────────────────────────┐
│              HỆ THỐNG PHÂN QUYỀN                   │
│         (Quản lý bởi AccessManager.sol)            │
├────────────────────────────────────────────────────┤
│                                                    │
│  🔴 ADMIN_ROLE (Quyền cao nhất)                    │
│  │  • grantRole/revokeRole cho người khác          │
│  │  • Quản lý Treasury, mở khoá snapshot           │
│  │                                                 │
│  ├── 🟢 MINTER_ROLE (Quyền in token)              │
│  │   • Gọi hàm mint(address, amount)               │
│  │                                                 │
│  ├── 🟣 VAULT_ROLE (Quyền hệ thống đặc biệt)       │
│  │   • Quyền để StakingVault gọi sang AirdropPoints│
│  │                                                 │
│  └── ⚪ USER (Ai cũng được, không cần role)        │
│      • transfer(), approve(), burn()               │
│      • Khóa token vào TokenLocker                  │
│      • Staking, Claim Airdrop                      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## PHẦN 2: CHI TIẾT DANH SÁCH KHỐI CONTRACT (7 SMART CONTRACTS)

Hệ thống được thiết kế theo kiến trúc modular, tách biệt rõ các layer:
- **Core:** quản lý token và quyền truy cập
- **Feature:** staking, locking, tích điểm
- **Fund:** quản lý tài sản (Treasury)
- **Distribution:** phân phối phần thưởng (Airdrop)

### 2.1 LaunchToken (Core)
* **Chức năng:** Triển khai token chuẩn ERC20, kiểm soát thời điểm mở giao dịch, hỗ trợ mint và burn.
* **Đặc điểm:**
  - `mint` chỉ dành cho MINTER_ROLE.
  - `burn` cho phép user tự thực hiện.
  - `openTrading` cho phép admin kích hoạt hệ thống.
  - Chỉ cho phép `transfer` sau khi hệ thống được launch.
  - Hỗ trợ cơ chế burnRate (auto burn khi transfer nếu cần).

### 2.2 AccessManager (Core)
* **Chức năng:** Quản lý role toàn hệ thống.
* **Đặc điểm:**
  - Sử dụng RBAC (Role-Based Access Control).
  - Các role chính: `ADMIN_ROLE`, `MINTER_ROLE`, `VAULT_ROLE`.
  - `grantRole` và `revokeRole` chỉ do admin thực hiện.
  - Các contract khác query quyền thông qua AccessManager.

### 2.3 TokenLocker (Feature)
* **Chức năng:** Khóa token theo thời gian.
* **Đặc điểm:**
  - Mỗi user có thể có nhiều lock.
  - `lock(amount, duration)` chỉ hoạt động sau `launch`.
  - `unlock(lockId)` cho phép rút token sau khi hết thời gian khóa.
  - Không liên quan đến reward hoặc staking.

### 2.4 StakingVault (Feature)
* **Chức năng:** Cho phép user stake token và nhận reward điểm.
* **Đặc điểm:**
  - Sử dụng mô hình `accRewardPerToken` để tính reward chính xác.
  - Có biến `ACC_REWARD_PRECISION` để tránh mất độ chính xác.
  - `stake`: gửi token vào vault.
  - `unstake`: rút token và cập nhật reward.
  - `claimRewards`: nhận reward.
  - `emergencyWithdraw`: rút toàn bộ vốn, bỏ qua reward.
  - Sau mỗi hành động stake, hệ thống cập nhật điểm vào `AirdropPoints`.

### 2.5 AirdropPoints (Feature)
* **Chức năng:** Ghi nhận điểm của user phục vụ airdrop.
* **Đặc điểm:**
  - Không giữ token, chỉ làm accounting.
  - `addPoints` chỉ được gọi bởi contract có `VAULT_ROLE`.
  - `snapshot` tạo mốc thời gian (epoch) cho airdrop.
  - `snapshotId` dùng để phân biệt các đợt airdrop.
  - `getPoints(user, snapshotId)` trả về điểm tại thời điểm snapshot.

### 2.6 Treasury (Fund)
* **Chức năng:** Quản lý toàn bộ quỹ token của hệ thống.
* **Đặc điểm:**
  - `deposit` để nạp token vào hệ thống.
  - `withdraw` chỉ dành cho admin.
  - `approveSpender` cấp allowance cho contract phân phối (Distributor).
  - Không chứa logic airdrop hoặc staking. Đóng vai trò “két tiền”.

### 2.7 AirdropDistributor (Distribution)
* **Chức năng:** Phân phối token airdrop cho user.
* **Đặc điểm:**
  - `claim`: Đọc điểm từ `AirdropPoints` theo snapshot -> kiểm tra user đã claim chưa -> tính reward -> gọi `transferFrom` từ `Treasury`.
  - Sử dụng mapping `claimed[snapshotId][user]` để chống double claim.
  - `calculateReward` là hàm view để tính reward.
  - Sử dụng `ReentrancyGuard` để chống tấn công.

---

## PHẦN 3: LUỒNG HOẠT ĐỘNG CHÍNH

1. Admin mint token thông qua **LaunchToken**.
2. Admin gọi `openTrading` để mở hệ thống.
3. User stake token vào **StakingVault**.
4. **StakingVault** cập nhật điểm vào **AirdropPoints**.
5. Admin gọi `snapshot` để fix điểm tại một thời điểm.
6. Admin nạp token vào **Treasury**.
7. Admin cấp allowance (ủy quyền) cho **AirdropDistributor**.
8. User gọi `claim` tại **AirdropDistributor**.
9. Distributor lấy token từ **Treasury** và chuyển cho user.

---

## PHẦN 4: CƠ CHẾ BẢO MẬT & RÀNG BUỘC (INVARIANTS)

### Cơ chế bảo mật
- **ReentrancyGuard:** Áp dụng cho StakingVault và AirdropDistributor.
- **Pausable:** Áp dụng cho LaunchToken (có thể mở rộng).
- **RBAC:** Kiểm soát toàn bộ quyền thông qua AccessManager.
- **Allowance control:** Treasury chỉ cấp quyền cho Distributor.
- **Snapshot isolation:** Mỗi đợt airdrop độc lập theo snapshotId.

### Các ràng buộc hệ thống (Invariants)
- Mội user chỉ được claim một lần trên mỗi snapshot.
- Tổng reward claim không được vượt quá số dư Treasury.
- Không được phép stake, lock hoặc transfer trước khi launch.
- `emergencyWithdraw` phải reset trạng thái reward.
- Allowance phải được quản lý an toàn, tránh race condition.

### Rủi ro và hướng xử lý
- **Double claim:** Sử dụng mapping theo snapshotId.
- **Thiếu thanh khoản trong Treasury:** Kiểm tra balance trước khi transfer.
- **Race condition khi approve:** Sử dụng `increaseAllowance` hoặc reset về 0 trước.
- **Reentrancy:** Sử dụng ReentrancyGuard.
- **Admin abuse:** Khuyến nghị dùng multisig hoặc timelock.

---

## PHẦN 5: CẤU TRÚC THƯ MỤC DỰ ÁN (HARDHAT)

```text
blockchain/
├── contracts/
│   ├── core/
│   │   ├── LaunchToken.sol
│   │   └── AccessManager.sol
│   ├── features/
│   │   ├── TokenLocker.sol
│   │   ├── StakingVault.sol
│   │   └── AirdropPoints.sol
│   ├── fund/
│   │   └── Treasury.sol
│   └── distribution/
│       └── AirdropDistributor.sol
├── test/
├── ignition/
│   └── modules/
├── hardhat.config.ts
└── package.json
```

---

## PHẦN 6: KẾ HOẠCH TRIỂN KHAI PHÁT TRIỂN

Hệ thống đạt các tiêu chí:
- Tách biệt rõ ràng giữa logic và tài sản.
- Kiến trúc modular, dễ audit và triển khai thực tế.

**Các bước tiếp theo để triển khai:**
1. Setup cấu trúc Hardhat chuẩn.
2. Code AccessManager & LaunchToken đầu tiên.
3. Code các module StakingVault, TokenLocker, AirdropPoints.
4. Xây dựng Treasury và AirdropDistributor.
5. Setup hệ thống Script Test với Mocha/Chai (Unit/Integration Test Coverage).
6. Viết script Hardhat Ignition để Deploy.
