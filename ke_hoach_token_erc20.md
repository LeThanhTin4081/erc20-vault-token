# DỰ ÁN: Thiết kế và triển khai hệ thống Token ERC-20 với cơ chế quản trị trên nền tảng Blockchain Ethereum

## Thông tin dự án

- **Đề tài:** Thiết kế và triển khai hệ thống Token ERC-20 với cơ chế quản trị trên nền tảng Blockchain Ethereum
- **Mạng:** Ethereum Sepolia (Testnet)
- **Số lượng contract:** 3
- **Team:** 4 người
- **Công nghệ chính:** Solidity, Hardhat, OpenZeppelin, Viem, MetaMask

---

## THIẾT KẾ TOKEN (TOKENOMICS)

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

```
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

```
┌──────────────────────────────────────────────────────┐
│         PHÂN BỔ 1,000,000 VLT BAN ĐẦU               │
│                                                      │
│  ████████████████      30%  =  300,000 VLT           │
│  │ Quỹ phát triển (Team)                             │
│  │ → Khóa 6 tháng (180 ngày), sau đó mới rút được   │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Bán công khai (Public Sale)                       │
│  │ → Nạp vào TokenSale contract, ai cũng mua được   │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Quỹ gọi vốn (Seed / Series A)                     │
│  │ → Phân bổ cho nhà đầu tư chiến lược               │
│                                                      │
│  ████████████          20%  =  200,000 VLT           │
│  │ Cộng đồng (Community / Airdrop)                   │
│  │ → Thưởng cho người dùng, marketing                │
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
| 🛒 Public Sale | 20% | 200,000 VLT | Không khóa | Bán cho công chúng qua TokenSale |
| 💼 Quỹ gọi vốn (Seed/Series A) | 20% | 200,000 VLT | Theo thỏa thuận | Bán cho quỹ/nhà đầu tư chiến lược |
| 🎁 Community | 20% | 200,000 VLT | Không khóa | Airdrop, thưởng người dùng |
| 🏦 Reserve | 10% | 100,000 VLT | Không khóa | Admin giữ dự phòng |

### 4. Cơ chế khóa Token (Token Locking / Vesting)

**Tại sao phải khóa?**
- Tránh team bán hết token ngay → mất giá
- Tạo niềm tin cho nhà đầu tư
- Giống các dự án crypto thật (team luôn bị khóa 6-24 tháng)

**Quy tắc khóa trong dự án:**

| Quỹ | Số lượng | Thời gian khóa | Cách mở |
|-----|----------|-----------------|---------|
| Team/Dev | 300,000 VLT | 180 ngày (6 tháng) | Gọi `release()` sau 180 ngày |
| Ví dụ demo | Tùy chọn | 60 giây (để test nhanh) | Gọi `release()` sau 60s |

**Flow khóa token:**

```
1. Admin deploy VaultToken → nhận 1,000,000 VLT
2. Admin approve 300,000 VLT cho TokenTimelock contract
3. Admin gọi lock(300000, 180 ngày) → token bị khóa
4. Trước 180 ngày → gọi release() → ❌ REVERT
5. Sau 180 ngày → gọi release() → ✅ nhận lại 300,000 VLT
```

### 5. Cơ chế bán Token (Token Sale)

| Thông số | Giá trị | Giải thích |
|----------|---------|------------|
| **Tỷ giá mặc định** | 1 ETH = 1,000 VLT | Gửi 0.001 ETH → nhận 1 VLT |
| **Có thể đổi giá** | Có (chỉ Admin) | Admin gọi `setPrice()` |
| **Mở/đóng bán** | Có (chỉ Admin) | Admin gọi `openSale()` / `closeSale()` |
| **Nguồn token bán** | Mint mới hoặc từ balance | TokenSale cần MINTER_ROLE hoặc admin chuyển VLT vào |

**Flow mua token:**

```
1. Admin mở bán → saleOpen = true
2. User gửi 0.1 ETH vào TokenSale contract
3. Contract tính: 0.1 × 1000 = 100 VLT
4. Contract mint 100 VLT cho user (hoặc transfer từ balance)
5. ETH nằm trong contract → Admin rút khi cần
```

### 6. Quyền Admin & Quản trị (Governance)

```
┌────────────────────────────────────────────────────┐
│              HỆ THỐNG PHÂN QUYỀN                   │
├────────────────────────────────────────────────────┤
│                                                    │
│  🔴 DEFAULT_ADMIN_ROLE (Quyền cao nhất)            │
│  │  • Cấp role cho người khác                      │
│  │  • Thu hồi role từ người khác                   │
│  │  • Là người deploy contract                     │
│  │  • Không ai cấp/thu role của admin              │
│  │    (trừ khi admin tự từ bỏ)                     │
│  │                                                 │
│  ├── 🟢 MINTER_ROLE (Quyền in token)              │
│  │   • Gọi mint(address, amount)                   │
│  │   • Tạo token mới (trong giới hạn cap)          │
│  │   • KHÔNG THỂ: pause, cấp role, rút ETH        │
│  │                                                 │
│  ├── 🟡 PAUSER_ROLE (Quyền tạm dừng)              │
│  │   • Gọi pause() → dừng MỌI giao dịch token     │
│  │   • Gọi unpause() → mở lại                     │
│  │   • Dùng khi: phát hiện hack, lỗi bảo mật      │
│  │   • KHÔNG THỂ: mint, cấp role, rút ETH         │
│  │                                                 │
│  └── ⚪ USER (Ai cũng được, không cần role)        │
│      • transfer() — chuyển token                   │
│      • approve() — ủy quyền                       │
│      • burn() — đốt token của mình                 │
│      • Mua token từ TokenSale                      │
│      • Khóa token vào TokenTimelock                │
│      • KHÔNG THỂ: mint, pause, cấp role            │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Kịch bản bảo mật:**

| Tình huống | Admin làm gì |
|-----------|-------------|
| Phát hiện lỗ hổng bảo mật | → Gọi `pause()` → dừng mọi giao dịch |
| Đã sửa xong lỗi | → Gọi `unpause()` → mở lại |
| Minter bị hack ví | → Gọi `revokeRole(MINTER, minter_address)` → thu quyền |
| Cần thêm minter mới | → Gọi `grantRole(MINTER, new_address)` → cấp quyền |
| Cần mở rộng cung | → Minter gọi `mint(address, amount)` (trong cap) |
| Admin muốn từ bỏ quyền | → Gọi `renounceRole()` → không thể đảo ngược! |

### 7. Tóm tắt Tokenomics

```
╔═════════════════════════════════════════════════════╗
║              TOKENOMICS — VAULTTOKEN (VLT)          ║
╠═════════════════════════════════════════════════════╣
║  Tên:          VaultToken                           ║
║  Symbol:       VLT                                  ║
║  Decimals:     18                                   ║
║  Initial:      1,000,000 VLT                        ║
║  Max Cap:      10,000,000 VLT                       ║
║  Mintable:     ✅ (MINTER_ROLE, trong cap)           ║
║  Burnable:     ✅ (ai cũng burn được token mình)     ║
║  Pausable:     ✅ (PAUSER_ROLE)                      ║
║  Governance:   AccessControl (Admin/Minter/Pauser)  ║
║  Lock:         TokenTimelock (khóa có kỳ hạn)      ║
║  Sale:         TokenSale (1 ETH = 1000 VLT)         ║
║  Mạng:         Ethereum Sepolia                     ║
║  Chuẩn:        OpenZeppelin ERC-20                  ║
╚═════════════════════════════════════════════════════╝
```

---

## PHẦN 1: KIẾN THỨC CẦN HỌC

### 1.1 Kiến thức nền tảng (cả team cần biết)

| STT | Chủ đề | Mô tả | Nguồn học |
|-----|--------|-------|-----------|
| 1 | Blockchain là gì | Block, transaction, hash, consensus | YouTube tiếng Việt |
| 2 | Ethereum cơ bản | Account, Gas, EVM, Smart Contract | ethereum.org |
| 3 | Solidity cơ bản | Biến, hàm, modifier, event, mapping | solidity-by-example.org |
| 4 | ERC-20 là gì | Chuẩn token: transfer, approve, balanceOf | docs.openzeppelin.com |
| 5 | MetaMask | Tạo ví, kết nối mạng test, gửi giao dịch | metamask.io |
| 6 | Testnet vs Mainnet | Tại sao dùng testnet, cách xin ETH test | Thực hành |

### 1.2 Kiến thức chuyên sâu (theo vai trò)

**Người viết Contract:**
- OpenZeppelin Contracts (ERC20, AccessControl, Pausable)
- Solidity nâng cao (inheritance, modifier, event)
- Bảo mật: reentrancy, overflow, access control

**Người viết Test:**
- Hardhat testing framework
- Chai assertions (expect, revert, emit)
- Test coverage (kiểm tra bao phủ code)

**Người viết Frontend:**
- HTML/CSS/JavaScript
- Viem (thư viện kết nối blockchain)
- MetaMask integration (kết nối ví)

### 1.3 Thuật ngữ quan trọng

| Thuật ngữ | Nghĩa | Ví dụ |
|-----------|-------|-------|
| **ERC-20** | Chuẩn token trên Ethereum | USDT, LINK, UNI đều là ERC-20 |
| **Mint** | In/tạo thêm token mới | Minter tạo 1000 VLT cho user A |
| **Burn** | Đốt/hủy token vĩnh viễn | User đốt 500 VLT → tổng cung giảm |
| **Pause** | Tạm dừng mọi giao dịch | Khi bị hack → pause → chặn hacker |
| **Role** | Vai trò/quyền hạn | Admin, Minter, Pauser |
| **Approve** | Ủy quyền cho người khác xài token | User cho phép contract tiêu 100 VLT |
| **Allowance** | Số token được ủy quyền | Contract được xài tối đa 100 VLT |
| **Total Supply** | Tổng số token đang tồn tại | 1,000,000 VLT |
| **Max Supply (Cap)** | Giới hạn tối đa, không mint quá | 10,000,000 VLT |
| **Timelock** | Khóa token trong thời gian nhất định | Khóa 1000 VLT trong 30 ngày |
| **Gas** | Phí giao dịch trên blockchain | Mỗi transfer tốn ~0.001 ETH gas |
| **ABI** | Bảng hướng dẫn gọi hàm contract | Frontend dùng ABI để biết gọi hàm nào |

---

## PHẦN 2: CÔNG CỤ & TOOLS CÀI ĐẶT

### 2.1 Software cần cài (cả team)

| STT | Tool | Mục đích | Link tải |
|-----|------|----------|----------|
| 1 | **Node.js LTS** | Chạy JavaScript/TypeScript | https://nodejs.org |
| 2 | **VS Code** | Viết code | https://code.visualstudio.com |
| 3 | **Git** | Quản lý source code | https://git-scm.com |
| 4 | **MetaMask** | Ví Ethereum (extension Chrome) | https://metamask.io |

### 2.2 Extension VS Code

| Extension | Mục đích |
|-----------|----------|
| Solidity (Nomic Foundation) | Highlight + autocomplete Solidity |
| Prettier | Format code tự động |

### 2.3 Thư viện npm (cài trong dự án)

| Thư viện | Mục đích | Lệnh cài |
|----------|----------|----------|
| Hardhat | Framework compile/test/deploy | `npm install --save-dev hardhat` |
| OpenZeppelin Contracts | Thư viện contract chuẩn | `npm install @openzeppelin/contracts` |
| Viem | Kết nối blockchain từ JS | `npm install viem` |
| TypeScript | Ngôn ngữ viết script/test | `npm install --save-dev typescript` |
| Chai | Thư viện assertion cho test | `npm install --save-dev chai` |

### 2.4 Tài khoản cần tạo

| Tài khoản | Mục đích |
|-----------|----------|
| MetaMask Wallet | Ví để deploy + test |
| Etherscan Account | Verify source code (tùy chọn) |
| GitHub Account | Lưu source code nhóm |

### 2.5 ETH Test (miễn phí)

Cần xin ETH test trên Ethereum Sepolia để trả gas:
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### 2.6 Ganache — Blockchain cá nhân (theo yêu cầu thầy)

#### Ganache là gì?

Ganache (thuộc bộ công cụ Truffle Suite) là một **mạng Blockchain cá nhân** chạy ngay trên máy tính. Hãy tưởng tượng nó như một "phòng thí nghiệm" riêng của Ethereum.

#### Tại sao cần dùng Ganache?

| Lợi ích | Mô tả |
|---------|-------|
| **Miễn phí & an toàn** | Có sẵn 10 ví × 100 ETH "giả" để thử nghiệm, không tốn tiền thật |
| **Tốc độ tức thì** | Giao dịch xử lý ngay lập tức (Ethereum thật phải đợi ~15 giây) |
| **Kiểm soát hoàn toàn** | Xem trạng thái ví, log giao dịch, trạng thái blockchain qua GUI |
| **Offline** | Chạy không cần internet, phù hợp để học & debug |

#### Quy trình tạo Token ERC-20 với Ganache

```
Bước 1: Viết code Solidity
  └── Định nghĩa tên, ký hiệu, tổng cung, hàm transfer, balanceOf...

Bước 2: Khởi động Ganache
  └── Mở Ganache → có ngay server blockchain (http://127.0.0.1:7545)
  └── 10 ví × 100 ETH sẵn sàng

Bước 3: Deploy contract lên Ganache
  └── Cấu hình Hardhat kết nối vào Ganache
  └── Chạy lệnh deploy → contract nằm trên blockchain nội bộ
  └── Gas (giả) bị trừ từ ví đầu tiên

Bước 4: Thử nghiệm giao dịch
  └── Kết nối MetaMask vào mạng Ganache
  └── Chuyển token giữa các ví
  └── Kiểm tra lỗi (gửi quá số dư, quyền hạn...)
  └── Test frontend DApp kết nối với Ganache
```

#### Ganache vs Hardhat Network

| So sánh | Ganache | Hardhat Network |
|---------|--------|-----------------|
| Nhà phát triển | Truffle Suite | Nomic Foundation |
| Trạng thái | ⚠️ Đã archive (ngưng phát triển) | ✅ Đang active |
| Giao diện | GUI trực quan | Dòng lệnh (CLI) |
| Tích hợp | Truffle / Hardhat | Hardhat (tích hợp sẵn) |
| Blockchain cá nhân | ✅ Có | ✅ Có |
| Tốc độ | Tức thì | Tức thì |
| ETH giả | 10 ví × 100 ETH | Tùy cấu hình |

> **Ghi chú:** Dự án này dùng **Hardhat Network** (tích hợp sẵn trong Hardhat) để test local vì nó hiện đại hơn và không cần cài thêm. Khi chạy `npx hardhat test`, Hardhat tự tạo blockchain giả lập tương tự Ganache. Sau khi test xong local → deploy lên **Ethereum Sepolia** (testnet thật).

#### Cài đặt Ganache (tùy chọn — nếu thầy yêu cầu demo)

```cmd
npm install -g ganache
```

Chạy Ganache CLI:

```cmd
npx ganache --port 7545
```

Cấu hình trong `hardhat.config.ts`:

```typescript
// Thêm mạng Ganache vào cấu hình
ganache: {
  url: "http://127.0.0.1:7545",
  // Không cần private key — Ganache tự cấp 10 ví
}
```

Deploy lên Ganache:

```cmd
npx hardhat run scripts/deploy.ts --network ganache
```

---

## PHẦN 3: PHÂN CÔNG TEAM 4 NGƯỜI

### Sơ đồ phân công

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEAM 4 NGƯỜI                               │
├────────────────┬───────────────┬───────────────┬────────────────────┤
│  THÀNH VIÊN 1  │ THÀNH VIÊN 2  │ THÀNH VIÊN 3  │   THÀNH VIÊN 4   │
│  Contract Dev  │ Contract Dev  │ Tester        │   Frontend Dev    │
│  (Token chính) │ (Lock + Sale) │ (Test+Script) │   (Web + UX)      │
├────────────────┼───────────────┼───────────────┼────────────────────┤
│ • VaultToken   │ • TokenTime-  │ • Test 3      │ • HTML giao diện  │
│   .sol         │   lock.sol    │   contract    │ • CSS dark theme   │
│ • Setup dự án  │ • TokenSale   │ • 22+ test    │ • JS kết nối      │
│ • Deploy all   │   .sol        │   case        │   MetaMask        │
│ • Verify code  │ • Hỗ trợ      │ • 2 script    │ • Hiển thị token  │
│ • hardhat.     │   deploy      │   tương tác   │ • Lịch sử GD      │
│   config.ts    │               │               │ • Responsive      │
├────────────────┼───────────────┼───────────────┼────────────────────┤
│ Output:        │ Output:       │ Output:       │ Output:            │
│ VaultToken.sol │ 2 file .sol   │ 3 file test   │ index.html         │
│ deploy.ts      │               │ 2 file script │ style.css          │
│ hardhat.config │               │               │ app.js             │
└────────────────┴───────────────┴───────────────┴────────────────────┘
```

### 👤 Thành viên 1 — Contract Developer chính (Token + Setup + Deploy)

**Chịu trách nhiệm:** VaultToken.sol, cấu hình dự án, deploy, verify.

| File phụ trách | Mô tả |
|----------------|--------|
| `hardhat.config.ts` | Cấu hình mạng Ethereum Sepolia + Ganache |
| `contracts/VaultToken.sol` | Token ERC-20 chính (mint, burn, pause, roles) |
| `scripts/deploy.ts` | Script deploy 3 contract lên Sepolia |
| `.env` | Cấu hình private key + RPC |

### 👤 Thành viên 2 — Contract Developer phụ (Lock + Sale)

**Chịu trách nhiệm:** TokenTimelock.sol, TokenSale.sol.

| File phụ trách | Mô tả |
|----------------|--------|
| `contracts/TokenTimelock.sol` | Khóa token có kỳ hạn |
| `contracts/TokenSale.sol` | Mua token bằng ETH |

### 👤 Thành viên 3 — Tester (Test + Script tương tác)

**Chịu trách nhiệm:** Viết test cho 3 contract + script đọc/ghi dữ liệu.

| File phụ trách | Mô tả |
|----------------|--------|
| `test/VaultToken.ts` | Test token (12+ case) |
| `test/TokenTimelock.ts` | Test khóa token (5+ case) |
| `test/TokenSale.ts` | Test mua token (5+ case) |
| `scripts/interact-read.ts` | Đọc dữ liệu contract |
| `scripts/interact-write.ts` | Ghi dữ liệu contract |

### 👤 Thành viên 4 — Frontend Developer (Web + UX)

**Chịu trách nhiệm:** Giao diện web, kết nối MetaMask, UX.

| File phụ trách | Mô tả |
|----------------|--------|
| `frontend/index.html` | Cấu trúc giao diện |
| `frontend/style.css` | Dark theme, glassmorphism, responsive |
| `frontend/app.js` | Kết nối MetaMask + gọi contract |

### Công việc chung (cả team)

| Công việc | Ai làm |
|-----------|--------|
| Viết README.md | TV1 lead, cả team bổ sung |
| Viết HUONG_DAN.md | TV3 lead (vì biết rõ lệnh terminal) |
| Viết báo cáo Word (nếu có) | Chia 4 phần, mỗi người viết phần mình |
| Quay video demo | TV4 quay, cả team demo |
| Trình bày trước thầy | Cả 4 nắm rõ, mỗi người trình bày phần mình |

---

## PHẦN 4: LỘ TRÌNH CHI TIẾT (2.5 TUẦN CODE + 0.5 TUẦN DOCS)

> **NGUYÊN TẮC QUAN TRỌNG KHI HỎI AI:**
>
> ❌ SAI: "Làm hết task này cho tôi" → AI làm ồ ạt, bạn không hiểu gì
>
> ✅ ĐÚNG: Hỏi từng bước nhỏ, hiểu xong bước này mới qua bước tiếp
>
> Ví dụ đúng cách hỏi:
> 1. "Giải thích ERC20 của OpenZeppelin hoạt động thế nào?"
> 2. "Viết hàm mint với comment giải thích từng dòng"
> 3. "Tại sao cần modifier onlyRole(MINTER_ROLE)?"
> 4. "Chạy compile thử xem có lỗi gì không?"

---

### TUẦN 1: SETUP + CONTRACT TOKEN CHÍNH

---

#### 📅 Ngày 1 — Setup dự án (CẢ TEAM cùng làm)

**Mục tiêu:** Mọi người cùng cài tools, tạo dự án, đảm bảo ai cũng chạy được.

**Bước 1: Cài đặt tools (mỗi người tự cài trên máy mình)**

```cmd
:: Kiểm tra Node.js đã cài chưa
node --version
:: Phải hiện v18.x.x hoặc v20.x.x

:: Kiểm tra Git
git --version
```

Nếu chưa có → tải tại:
- Node.js: https://nodejs.org
- Git: https://git-scm.com
- MetaMask: https://metamask.io (extension Chrome)
- VS Code: https://code.visualstudio.com

**Bước 2: TV1 tạo dự án + push lên GitHub**

```cmd
:: TV1 chạy các lệnh này
mkdir erc20-token-project
cd erc20-token-project
npm init -y
npm install --save-dev hardhat typescript ts-node @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
npm install viem
npx hardhat init
:: Chọn "Create a TypeScript project"
```

```cmd
:: Tạo cấu trúc thư mục
mkdir contracts test scripts frontend
```

```cmd
:: Tạo .gitignore
echo node_modules > .gitignore
echo .env >> .gitignore
echo artifacts >> .gitignore
echo cache >> .gitignore
echo typechain-types >> .gitignore
```

```cmd
:: Push lên GitHub
git init
git add .
git commit -m "Init project"
git remote add origin <link-repo>
git push -u origin main
```

**Bước 3: TV2, TV3, TV4 clone về**

```cmd
git clone <link-repo>
cd erc20-token-project
npm install
```

**Bước 4: Kiểm tra mọi người chạy được**

```cmd
:: Mỗi người chạy thử
npx hardhat compile
:: Phải hiện "Compiled X Solidity files successfully"
```

**Bước 5: Tạo ví MetaMask + xin ETH test**

- Mở MetaMask → tạo ví mới hoặc dùng ví cũ
- Chuyển sang mạng **Ethereum Sepolia**
- Xin ETH test: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

**✅ Checklist cuối ngày 1:**
- [ ] Cả 4 người cài xong tools
- [ ] Clone repo + `npm install` thành công
- [ ] `npx hardhat compile` chạy không lỗi
- [ ] MetaMask có ETH test trên Sepolia

---

#### 📅 Ngày 2 — Học kiến thức ERC-20 (CẢ TEAM)

**Mục tiêu:** Hiểu ERC-20 là gì, OpenZeppelin hoạt động thế nào.

**Cả team đọc/xem:**
- ERC-20 là gì: https://docs.openzeppelin.com/contracts/5.x/erc20
- AccessControl: https://docs.openzeppelin.com/contracts/5.x/access-control

**Cách hỏi AI để học:**

```
TV1 hỏi: "Giải thích chuẩn ERC-20 gồm những hàm nào, mỗi hàm làm gì?"
TV1 hỏi: "AccessControl của OpenZeppelin hoạt động thế nào? VD với MINTER_ROLE?"
TV2 hỏi: "Timelock contract hoạt động thế nào? Người dùng khóa token như thế nào?"
TV2 hỏi: "Viết contract bán token, người dùng gửi ETH nhận token, logic thế nào?"
TV3 hỏi: "Cách viết test Hardhat cho ERC-20, VD test transfer?"
TV4 hỏi: "Cách dùng Viem + MetaMask gọi hàm balanceOf của ERC-20?"
```

**✅ Checklist cuối ngày 2:**
- [ ] Cả team hiểu ERC-20 (transfer, approve, balanceOf)
- [ ] Hiểu AccessControl (role, grant, revoke)
- [ ] Hiểu Pausable (pause, unpause)

---

#### 📅 Ngày 3-4 — Viết VaultToken.sol (TV1 chính, TV3 hỗ trợ)

**TV1 làm:** Viết `contracts/VaultToken.sol`

Cách hỏi AI (từng bước, KHÔNG hỏi hết 1 lần):

```
Bước 1: "Tạo file VaultToken.sol kế thừa ERC20, ERC20Burnable, ERC20Pausable,
         ERC20Capped, AccessControl từ OpenZeppelin. Chưa cần code hàm."

Bước 2: "Thêm 3 role: MINTER_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE.
         Giải thích từng role làm gì."

Bước 3: "Viết constructor: tên VaultToken, symbol VLT, tổng cung ban đầu
         1 triệu, cap 10 triệu. Comment giải thích từng dòng."

Bước 4: "Viết hàm mint() chỉ MINTER_ROLE mới gọi được. Kiểm tra cap."

Bước 5: "Viết hàm pause() và unpause() chỉ PAUSER_ROLE mới gọi được."

Bước 6: "Override hàm _update() để tích hợp Pausable. Giải thích tại sao cần."
```

Sau mỗi bước → compile thử:

```cmd
npx hardhat compile
:: Nếu lỗi → sửa → compile lại
```

**TV3 làm song song:** Bắt đầu viết test cho VaultToken

```
Hỏi AI: "Viết test case kiểm tra deploy VaultToken: name, symbol, totalSupply,
         owner có đủ 3 role. Dùng Hardhat + Chai."
```

```cmd
:: Chạy test
npx hardhat test test/VaultToken.ts
```

**TV2 làm:** Nghiên cứu + lên khung cho TokenTimelock.sol

```
Hỏi AI: "Giải thích logic contract khóa token:
         - User approve token cho contract
         - User gọi lock(amount, duration)
         - Sau duration giây → user gọi release()
         Viết pseudo code trước, chưa code thật."
```

**TV4 làm:** Thiết kế giao diện HTML

```
Hỏi AI: "Thiết kế trang web DApp Token ERC-20, dark theme, có các section:
         - Header (tên token, symbol, mạng)
         - Kết nối ví
         - Thông tin token (tổng cung, số dư, roles)
         - Chuyển token
         - Mua token
         - Khóa token
         - Lịch sử giao dịch
         Chỉ viết HTML + CSS trước, chưa cần JS."
```

**✅ Checklist cuối ngày 4:**
- [ ] TV1: VaultToken.sol compile thành công
- [ ] TV3: 5+ test case VaultToken pass
- [ ] TV2: Hiểu logic Timelock, có pseudo code
- [ ] TV4: Giao diện HTML/CSS hoàn thành (chưa có chức năng)

---

#### 📅 Ngày 5-6 — Test VaultToken + Viết TokenTimelock (TV1 review, TV2+TV3 chính)

**TV3 làm:** Hoàn thiện test VaultToken (12 test case)

```
Hỏi AI từng nhóm test:
1. "Viết test: MINTER mint token thành công, phát event Transfer"
2. "Viết test: User không có MINTER role → mint revert"
3. "Viết test: Mint vượt cap 10 triệu → revert"
4. "Viết test: User burn token thành công, totalSupply giảm"
5. "Viết test: PAUSER pause → transfer revert"
6. "Viết test: PAUSER unpause → transfer thành công lại"
7. "Viết test: Admin cấp MINTER role cho user mới"
8. "Viết test: Admin thu hồi MINTER role"
9. "Viết test: Transfer thành công giữa 2 user"
10. "Viết test: Approve + transferFrom thành công"
```

```cmd
:: Chạy test sau mỗi nhóm
npx hardhat test test/VaultToken.ts
:: Mục tiêu: 12/12 pass
```

**TV2 làm:** Viết `contracts/TokenTimelock.sol`

```
Hỏi AI từng bước:
1. "Tạo file TokenTimelock.sol, import IERC20 từ OpenZeppelin"
2. "Tạo struct LockInfo gồm: amount, unlockTime, released"
3. "Viết mapping từ address → LockInfo[]"
4. "Viết hàm lock(token, amount, durationSeconds):
    - Require amount > 0
    - transferFrom user → contract
    - Lưu vào mapping
    - Emit event TokenLocked"
5. "Viết hàm release(index):
    - Require chưa release
    - Require block.timestamp >= unlockTime
    - transfer token về user
    - Emit event TokenReleased"
6. "Viết hàm getLockedInfo(user) xem danh sách khóa"
```

```cmd
npx hardhat compile
```

**TV1 làm:** Review code TV2, sửa lỗi nếu có

**TV4 làm:** Viết CSS chi tiết (animations, hover effects, responsive)

**✅ Checklist cuối ngày 6:**
- [ ] TV3: 12/12 test VaultToken pass
- [ ] TV2: TokenTimelock.sol compile thành công
- [ ] TV4: CSS hoàn thiện, responsive mobile

---

#### 📅 Ngày 7 — Review tuần 1 + Fix bugs

**Cả team:**

```cmd
:: Pull code mới nhất
git pull origin main

:: Compile tất cả contract
npx hardhat compile

:: Chạy tất cả test
npx hardhat test

:: Kiểm tra kết quả
:: Mục tiêu: 12+ test pass, 0 fail
```

- Review code lẫn nhau (đọc code người khác, góp ý)
- Fix bugs nếu có
- Commit + push

```cmd
git add .
git commit -m "Tuần 1: VaultToken + TokenTimelock + tests"
git push
```

---

### TUẦN 2: CONTRACT SALE + TEST + FRONTEND

---

#### 📅 Ngày 8-9 — TokenSale.sol + Test Timelock (TV2+TV3 chính)

**TV2 làm:** Viết `contracts/TokenSale.sol`

```
Hỏi AI từng bước:
1. "Tạo TokenSale.sol, nhận địa chỉ VaultToken trong constructor"
2. "Biến: tokenPrice (1 ETH = 1000 VLT), saleOpen (bool), owner"
3. "Viết hàm buyTokens() payable:
    - Require saleOpen == true
    - Require msg.value > 0
    - Tính tokenAmount = msg.value * tokenPrice
    - Transfer VLT từ contract → buyer
    - Emit event TokensPurchased"
4. "Viết hàm setPrice(newPrice) onlyOwner"
5. "Viết hàm openSale() / closeSale() onlyOwner"
6. "Viết hàm withdrawETH() onlyOwner — rút ETH thu được"
```

```cmd
npx hardhat compile
```

**TV3 làm:** Test TokenTimelock + TokenSale

```
Hỏi AI:
"Viết 5 test case cho TokenTimelock:
1. Lock token thành công, event TokenLocked
2. Release trước hạn → revert
3. Release đúng hạn → nhận token về
4. Lock 0 token → revert
5. getLockedInfo trả đúng dữ liệu"
```

```cmd
npx hardhat test test/TokenTimelock.ts
```

Sau đó viết test TokenSale:

```
"Viết 5 test case cho TokenSale:
1. Mua token bằng ETH → nhận đúng số VLT
2. Sale đóng → mua revert
3. Admin đặt giá mới → mua theo giá mới
4. Admin rút ETH thành công
5. Gửi 0 ETH → revert"
```

```cmd
npx hardhat test test/TokenSale.ts
```

**TV1 làm:** Viết `scripts/deploy.ts` (deploy 3 contract)

```
Hỏi AI: "Viết script deploy 3 contract lên Ethereum Sepolia:
1. Deploy VaultToken (tổng cung 1 triệu, cap 10 triệu)
2. Deploy TokenTimelock
3. Deploy TokenSale (truyền địa chỉ VaultToken)
4. Cấp MINTER_ROLE cho TokenSale (để sale contract có thể mint)
5. In ra địa chỉ 3 contract"
```

**TV4 làm:** Viết `frontend/app.js` — kết nối MetaMask

```
Hỏi AI:
1. "Viết code import Viem từ CDN ESM, tạo publicClient kết nối Ethereum Sepolia"
2. "Viết hàm connectWallet() yêu cầu MetaMask chọn ví"
3. "Viết hàm tự động chuyển MetaMask sang mạng Ethereum Sepolia"
4. "Đọc thông tin token: name, symbol, totalSupply, balanceOf"
```

**✅ Checklist cuối ngày 9:**
- [ ] TV2: TokenSale.sol compile thành công
- [ ] TV3: 22+ test case all pass
- [ ] TV1: deploy.ts viết xong
- [ ] TV4: Kết nối MetaMask + đọc token info thành công

---

#### 📅 Ngày 10-11 — Deploy + Frontend hoàn thiện

**TV1 làm:** Deploy lên Ethereum Sepolia

```cmd
:: Tạo file .env
echo SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY > .env
echo SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY >> .env
```

```cmd
:: Deploy
npx hardhat run scripts/deploy.ts --network sepolia
:: Ghi lại 3 địa chỉ contract!!!
```

```cmd
:: Verify source code
npx hardhat verify --network sepolia <VaultToken_address> <constructor_args>
npx hardhat verify --network sepolia <TokenTimelock_address>
npx hardhat verify --network sepolia <TokenSale_address> <VaultToken_address>
```

**TV3 làm:** Viết script tương tác

```
Hỏi AI:
"Viết interact-read.ts: đọc name, symbol, totalSupply, balanceOf, paused,
 hasRole từ VaultToken trên Sepolia"

"Viết interact-write.ts: mint 1000 token, transfer 100 token, pause, unpause"
```

```cmd
:: Test script
npx hardhat run scripts/interact-read.ts --network sepolia
npx hardhat run scripts/interact-write.ts --network sepolia
```

**TV4 làm:** Hoàn thiện frontend

```
Hỏi AI từng chức năng:
1. "Viết hàm transfer token trên frontend, MetaMask confirm"
2. "Viết hàm mua token (gửi ETH → nhận VLT)"
3. "Viết hàm khóa token (approve + lock)"
4. "Viết phần hiển thị lịch sử giao dịch từ event"
5. "Viết phần hiện thông tin role (ai là admin, minter, pauser)"
```

**TV2 làm:** Hỗ trợ TV4, test frontend, fix bugs contract

**✅ Checklist cuối ngày 11:**
- [ ] 3 contract deployed trên Sepolia
- [ ] Source code verified trên Etherscan
- [ ] Script read/write hoạt động
- [ ] Frontend kết nối + hiển thị token info

---

#### 📅 Ngày 12-13 — Test toàn bộ + Fix bugs

**Cả team test:**

```cmd
:: Chạy lại tất cả test local
npx hardhat test
:: Mục tiêu: 22+ pass, 0 fail
```

**Test frontend trên Sepolia:**

```cmd
:: Chạy server frontend
npx -y serve frontend -l 3000 --no-clipboard
:: Mở http://localhost:3000
```

Checklist test frontend:
- [ ] Kết nối ví → hiện địa chỉ + số dư
- [ ] Transfer token → MetaMask confirm → số dư thay đổi
- [ ] Mua token bằng ETH → nhận VLT
- [ ] Khóa token → xem countdown
- [ ] Mở khóa (nếu hết hạn)
- [ ] Xem lịch sử giao dịch
- [ ] Đổi ví → hiện đúng thông tin ví mới
- [ ] Chuyển mạng tự đng

**Fix bugs nếu có, commit:**

```cmd
git add .
git commit -m "Tuần 2: Deploy + Frontend + Fix bugs"
git push
```

---

### TUẦN 3 (NỬA TUẦN): TÀI LIỆU + CHUẨN BỊ TRÌNH BÀY

---

#### 📅 Ngày 14-15 — Viết tài liệu

**TV1:** Viết README.md (giới thiệu dự án, công nghệ, cài đặt)

**TV2:** Viết phần giải thích 3 contract trong báo cáo

**TV3:** Viết HUONG_DAN.md (tất cả lệnh terminal, cách chạy)

**TV4:** Chụp screenshot giao diện, viết phần frontend trong báo cáo

**Cùng làm:** Chuẩn bị slide trình bày (nếu cần)

```
Slide gợi ý (10-15 slide):
1. Trang bìa: tên đề tài + tên nhóm
2. Mục tiêu dự án
3. Công nghệ sử dụng (Solidity, Hardhat, OpenZeppelin, Viem)
4. Sơ đồ kiến trúc hệ thống
5. Contract 1: VaultToken (cơ chế token, roles)
6. Contract 2: TokenTimelock (cơ chế khóa)
7. Contract 3: TokenSale (cơ chế mua bán)
8. Kết quả test (22+ pass)
9. Demo giao diện (screenshot)
10. Demo live
11. Bài học kinh nghiệm
12. Câu hỏi & trả lời
```

#### 📅 Ngày 16-17 — Demo + Trình bày

**Trước khi demo:**

```cmd
:: Đảm bảo test pass
npx hardhat test

:: Chạy frontend
npx -y serve frontend -l 3000 --no-clipboard
```

**Mỗi người trình bày phần mình:**
- TV1: Giới thiệu dự án + VaultToken + Deploy
- TV2: TokenTimelock + TokenSale
- TV3: Testing + Demo lệnh terminal
- TV4: Demo frontend live

---

### 📌 TÓM TẮT TIMELINE

| Ngày | TV1 (Contract chính) | TV2 (Contract phụ) | TV3 (Tester) | TV4 (Frontend) |
|------|---------------------|--------------------|--------------|----|
| 1 | Setup dự án + GitHub | Clone + cài tools | Clone + cài tools | Clone + cài tools |
| 2 | Học ERC-20 | Học Timelock | Học Testing | Học Viem + MetaMask |
| 3-4 | **VaultToken.sol** | Nghiên cứu Timelock | **Test VaultToken (5)** | **HTML + CSS** |
| 5-6 | Review code | **TokenTimelock.sol** | **Test VaultToken (12)** | CSS hoàn thiện |
| 7 | Review + fix bugs | Review + fix bugs | Chạy all test | Review UI |
| 8-9 | **deploy.ts** | **TokenSale.sol** | **Test Timelock + Sale** | **app.js (MetaMask)** |
| 10-11 | **Deploy Sepolia** | Hỗ trợ deploy | **Script read/write** | **Frontend hoàn thiện** |
| 12-13 | Test + fix bugs | Test + fix bugs | Test + fix bugs | Test + fix bugs |
| 14-15 | README.md | Báo cáo contract | HUONG_DAN.md | Screenshot + báo cáo |
| 16-17 | **Trình bày** | **Trình bày** | **Trình bày** | **Demo live** |


---

## PHẦN 5: CẤU TRÚC THƯ MỤC DỰ ÁN

```
blockchain/
├── contracts/
│   ├── VaultToken.sol           ← Token ERC-20 (OpenZeppelin)
│   ├── TokenTimelock.sol        ← Khóa token có kỳ hạn
│   └── TokenSale.sol            ← Mua token bằng ETH
├── test/
│   ├── VaultToken.ts            ← Test token (10+ case)
│   ├── TokenTimelock.ts         ← Test khóa token (5+ case)
│   └── TokenSale.ts             ← Test mua token (5+ case)
├── scripts/
│   ├── deploy.ts                ← Deploy 3 contract
│   ├── interact-read.ts         ← Đọc dữ liệu
│   └── interact-write.ts        ← Ghi dữ liệu
├── frontend/
│   ├── index.html               ← Giao diện web
│   ├── style.css                ← Dark theme
│   └── app.js                   ← Kết nối MetaMask
├── hardhat.config.ts            ← Cấu hình Hardhat
├── package.json                 ← Dependencies
├── .env                         ← Private key (KHÔNG COMMIT)
├── .gitignore                   ← Bỏ qua node_modules, .env
├── HUONG_DAN.md                 ← Hướng dẫn sử dụng
└── README.md                    ← Giới thiệu dự án
```

---

## PHẦN 6: 3 SMART CONTRACT — CHI TIẾT

### Contract 1: VaultToken.sol

**Kế thừa OpenZeppelin:**
- `ERC20` — Chuẩn token (transfer, balanceOf, approve, allowance)
- `ERC20Burnable` — Đốt token (burn)
- `ERC20Pausable` — Tạm dừng khi bị hack (pause/unpause)
- `ERC20Capped` — Giới hạn tổng cung tối đa (cap)
- `AccessControl` — Phân quyền (Admin, Minter, Pauser)

**Thông số token:**

| Thông số | Giá trị |
|----------|---------|
| Tên | VaultToken |
| Symbol | VLT |
| Decimals | 18 |
| Tổng cung ban đầu | 1,000,000 VLT |
| Tổng cung tối đa (cap) | 10,000,000 VLT |

**4 Role:**

| Role | Quyền |
|------|-------|
| DEFAULT_ADMIN_ROLE | Cấp/thu quyền, toàn quyền |
| MINTER_ROLE | Mint (in thêm token) |
| PAUSER_ROLE | Pause/Unpause hệ thống |
| USER (không cần role) | Transfer, burn, approve |

### Contract 2: TokenTimelock.sol

**Chức năng:**
- Người dùng khóa VLT trong X ngày
- Hết hạn → gọi release() → nhận lại VLT
- Chưa hết hạn → không rút được
- Xem thông tin khóa (số lượng, thời hạn, còn bao lâu)

### Contract 3: TokenSale.sol

**Chức năng:**
- Gửi ETH → nhận VLT theo tỷ giá (mặc định 1 ETH = 1000 VLT)
- Admin đặt giá mới
- Admin mở/đóng bán
- Admin rút ETH thu được
- Xem giá hiện tại, tổng đã bán

---

## PHẦN 7: TEST CASE DỰ KIẾN (20+)

### VaultToken.ts (10+ test)

| # | Test case | Kết quả mong đợi |
|---|-----------|-------------------|
| 1 | Deploy → owner có ADMIN + MINTER + PAUSER role | Pass |
| 2 | Tổng cung ban đầu = 1,000,000 VLT | Pass |
| 3 | Tên = "VaultToken", Symbol = "VLT" | Pass |
| 4 | MINTER mint thành công | Pass |
| 5 | Không có MINTER role → mint revert | Pass |
| 6 | Mint vượt cap (10M) → revert | Pass |
| 7 | User burn token thành công | Pass |
| 8 | PAUSER pause → transfer revert | Pass |
| 9 | PAUSER unpause → transfer thành công | Pass |
| 10 | Admin cấp/thu role thành công | Pass |
| 11 | Transfer thành công giữa 2 user | Pass |
| 12 | Approve + transferFrom thành công | Pass |

### TokenTimelock.ts (5+ test)

| # | Test case | Kết quả mong đợi |
|---|-----------|-------------------|
| 13 | Lock token thành công | Pass |
| 14 | Release trước hạn → revert | Pass |
| 15 | Release sau hạn → nhận lại token | Pass |
| 16 | Lock 0 token → revert | Pass |
| 17 | Xem thông tin lock chính xác | Pass |

### TokenSale.ts (5+ test)

| # | Test case | Kết quả mong đợi |
|---|-----------|-------------------|
| 18 | Mua token bằng ETH thành công | Pass |
| 19 | Sale đóng → mua revert | Pass |
| 20 | Admin đặt giá mới thành công | Pass |
| 21 | Admin rút ETH thành công | Pass |
| 22 | Gửi 0 ETH → revert | Pass |

---

## PHẦN 8: CHECKLIST TRƯỚC KHI NỘP

- [ ] 3 contract compile thành công
- [ ] 20+ test case all pass
- [ ] Deploy thành công lên Ethereum Sepolia
- [ ] Verify source code trên Etherscan
- [ ] Frontend hoạt động (kết nối MetaMask, hiển thị token)
- [ ] Code có comment tiếng Việt chi tiết
- [ ] File hướng dẫn (HUONG_DAN.md)
- [ ] Không commit .env
- [ ] README.md giới thiệu dự án
- [ ] Video demo (tùy chọn)
