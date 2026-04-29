# 🧪 KIỂM THỬ GIAO DIỆN FRONTEND — VaultToken (VLT)

## Thông tin chung

| Ví | Địa chỉ (Hardhat) | Số dư VLT sau Setup | Private Key (Hardhat mặc định) |
|---|---|---|---|
| **Account #0 (Admin)** | `0xf39F...2266` | 0 VLT (đã phân bổ hết) | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Account #1 (User test)** | `0x7099...d4E0` | 0 VLT | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Account #2 (PublicSale)** | `0x3C44...93CC` | **200,000 VLT** | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Account #3 (Seed)** | `0x90F7...85aD` | **200,000 VLT** | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| **Account #4 (Reserve)** | `0x1565...4512` | **100,000 VLT** | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

> [!IMPORTANT]
> **Cách chuyển ví trong MetaMask**: Mở MetaMask → Import Account → Paste Private Key ở trên.
> Sau mỗi lần reset node (`npm run node` + `npm run deploy:local:reset` + `npm run setup:local`), phải **Reset Account** trong MetaMask (Settings → Advanced → Clear activity tab data).

---

## PHẦN A — TEST VỚI VÍ ADMIN (Account #0 — `0xf39F...2266`)

> Admin đã phân bổ hết 1,000,000 VLT nên **số dư ví = 0 VLT**.

### A1. Tab Overview
| # | Hành động | Kết quả mong đợi | Contract liên quan |
|---|---|---|---|
| A1.1 | Mở `http://localhost:3000/console` | Hiển thị tổng quan hệ thống, địa chỉ ví Admin đúng `0xf39F...2266` | — |
| A1.2 | Kiểm tra số dư VLT | Hiển thị **0 VLT** (đã chuyển hết) | LaunchToken.balanceOf |

### A2. Tab Staking
| # | Hành động | Kết quả mong đợi | Contract liên quan |
|---|---|---|---|
| A2.1 | Nhập Stake = `1000`, bấm **Stake VLT** | ❌ **Revert** — `ERC20InsufficientBalance` (Admin có 0 VLT) | StakingVault.stake → transferFrom |
| A2.2 | Kiểm tra Wallet / Staked / Pending / Points | Tất cả = **0** | StakingVault.userInfo, pendingRewards |

### A3. Tab Airdrop
| # | Hành động | Kết quả mong đợi | Contract liên quan |
|---|---|---|---|
| A3.1 | Nhập Snapshot ID = `0`, bấm **Claim Token** | ❌ **Revert** — `zero reward` (Admin không có điểm) | AirdropDistributor.claim |
| A3.2 | Kiểm tra Snapshot Points / Reward | = **0** | AirdropPoints.getPoints |

### A4. Tab Locker
| # | Hành động | Kết quả mong đợi | Contract liên quan |
|---|---|---|---|
| A4.1 | Xem danh sách Locks bên phải | Hiển thị **Lock #0**: 300,000 VLT, ~179 ngày còn lại | TokenLocker.getLockInfo |
| A4.2 | Bấm **Unlock** trên Lock #0 | ❌ **Revert** — `not yet unlocked` (chưa đến 180 ngày) | TokenLocker.unlock |
| A4.3 | Nhập Lock = `100`, chọn 30D, bấm **Lock VLT** | ❌ **Revert** — `ERC20InsufficientBalance` (Admin có 0 VLT) | TokenLocker.lock |

### A5. Tab Admin
| # | Hành động | Kết quả mong đợi | Contract liên quan |
|---|---|---|---|
| A5.1 | Kiểm tra System Status | Wallet Role = **Admin**, Launch = **Open**, Treasury = **200,000**, Burn Rate = **0%** | AccessManager, LaunchToken, Treasury |
| A5.2 | Bấm **Snapshot** | ✅ Thành công — `currentSnapshotId` tăng lên 1 | AirdropPoints.snapshot |
| A5.3 | Nhập Auto burn = `5`, bấm **Apply** | ✅ Thành công — Burn Rate hiển thị **5%** (=500/10000) | LaunchToken.setBurnRate(500) |
| A5.4 | Nhập Auto burn = `11`, bấm **Apply** | ❌ **Revert** — `burn rate max 10%` | LaunchToken.setBurnRate |
| A5.5 | Bấm **Pause** | ✅ Hệ thống tạm dừng | LaunchToken.pause |
| A5.6 | Bấm **Unpause** | ✅ Hệ thống hoạt động lại | LaunchToken.unpause |

---

## PHẦN B — TEST VỚI VÍ PUBLICSALE (Account #2 — `0x3C44...93CC` — 200,000 VLT)

> [!TIP]
> Đây là ví có nhiều token nhất cùng với Seed. Dùng ví này test **full flow Staking → Claim Points → Snapshot → Claim Airdrop**.

### B1. Tab Overview
| # | Hành động | Kết quả mong đợi |
|---|---|---|
| B1.1 | Kết nối ví Account #2 | Hiển thị `0x3C44...93CC`, số dư **200,000 VLT** |

### B2. Tab Staking — Happy Path
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| B2.1 | Nhập Stake = `10000`, bấm **Stake VLT** | MetaMask popup yêu cầu **Approve** trước, sau đó confirm **Stake** → ✅ Thành công | StakingVault.stake |
| B2.2 | Kiểm tra VAULT STATS | Wallet = **190,000**, Staked = **10,000**, pool TVL = **10,000** | StakingVault.userInfo |
| B2.3 | Đợi 30–60 giây, reload trang | **Pending** > 0 (reward tích lũy theo thời gian) | StakingVault.pendingRewards |
| B2.4 | Bấm **Claim Points** | ✅ Points tăng lên > 0, Pending reset về ~0 | StakingVault.claimRewards → AirdropPoints.addPoints |
| B2.5 | Nhập Unstake = `5000`, bấm **Unstake** | ✅ Wallet = **195,000**, Staked = **5,000** | StakingVault.unstake |
| B2.6 | Nhập Unstake = `50000`, bấm **Unstake** | ❌ **Revert** — `insufficient stake` | StakingVault.unstake |

### B3. Tab Staking — Edge Cases
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| B3.1 | Nhập Stake = `0`, bấm **Stake VLT** | ❌ **Revert** — `amount must be > 0` | StakingVault.stake |
| B3.2 | Nhập Stake = `300000` (vượt số dư) | ❌ **Revert** — `ERC20InsufficientBalance` | transferFrom |

### B4. Tab Locker — Tạo Lock mới
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| B4.1 | Nhập Lock = `5000`, chọn **30D**, bấm **Lock VLT** | ✅ Approve + Lock thành công. Danh sách Locks hiện thêm Lock mới | TokenLocker.lock |
| B4.2 | Kiểm tra Lock vừa tạo | Amount = **5,000 VLT**, thời gian ~30 ngày | TokenLocker.getLockInfo |
| B4.3 | Bấm **Unlock** trên Lock vừa tạo | ❌ **Revert** — `not yet unlocked` | TokenLocker.unlock |
| B4.4 | Nhập Lock = `0`, bấm **Lock VLT** | ❌ **Revert** — `amount must be > 0` | TokenLocker.lock |

### B5. Tab Airdrop — Claim sau Snapshot
> [!IMPORTANT]
> **Điều kiện tiên quyết**: Phải đã thực hiện B2.4 (Claim Points) VÀ Admin đã bấm Snapshot (A5.2).

| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| B5.1 | Kiểm tra Snapshot Points tại ID cũ (trước snapshot) | Hiển thị số điểm > 0 | AirdropPoints.getPoints |
| B5.2 | Nhập Snapshot ID = `0`, bấm **Claim Token** | ✅ Nhận VLT về ví (reward = points × 1) | AirdropDistributor.claim |
| B5.3 | Bấm **Claim Token** lần 2 cùng Snapshot ID | ❌ **Revert** — `already claimed` (chống double-claim) | AirdropDistributor.claim |
| B5.4 | Nhập Snapshot ID = `999` (không tồn tại) | ❌ **Revert** — `zero reward` | AirdropDistributor.claim |

### B6. Tab Admin — Non-Admin Access
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| B6.1 | Kiểm tra System Status | Wallet Role = **User** (không phải Admin) | AccessManager.hasRole |
| B6.2 | Bấm **Snapshot** | ❌ **Revert** — `caller is not admin` | AirdropPoints.snapshot |
| B6.3 | Bấm **Pause** | ❌ **Revert** — `caller is not admin` | LaunchToken.pause |
| B6.4 | Nhập Burn Rate, bấm **Apply** | ❌ **Revert** — `caller is not admin` | LaunchToken.setBurnRate |

---

## PHẦN C — TEST VỚI VÍ SEED (Account #3 — `0x90F7...85aD` — 200,000 VLT)

### C1. Tab Staking — Stake lớn
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| C1.1 | Nhập Stake = `100000`, bấm **Stake VLT** | ✅ Approve + Stake thành công | StakingVault.stake |
| C1.2 | Kiểm tra VAULT STATS | Wallet = **100,000**, Staked = **100,000**, pool TVL tăng | StakingVault |
| C1.3 | Đợi 60s, bấm **Claim Points** | ✅ Points tích lũy. Nếu Account #2 cũng đang stake → reward chia đều theo tỷ lệ | StakingVault.claimRewards |
| C1.4 | Nhập Unstake = `100000`, bấm **Unstake** | ✅ Rút hết, Staked = 0, Wallet = 200,000 | StakingVault.unstake |

### C2. Tab Locker — Nhiều Lock
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| C2.1 | Lock `10000` VLT × **90D** | ✅ Lock #0 cho Account #3 | TokenLocker.lock |
| C2.2 | Lock `20000` VLT × **180D** | ✅ Lock #1 cho Account #3 | TokenLocker.lock |
| C2.3 | Kiểm tra danh sách Locks | 2 locks hiển thị đúng amount và thời gian | TokenLocker.getLockInfo |

### C3. Tab Admin — Quyền hạn
| # | Hành động | Kết quả mong đợi |
|---|---|---|
| C3.1 | Tất cả nút Admin (Snapshot/Pause/Unpause/Apply) | ❌ Đều **Revert** — `caller is not admin` |

---

## PHẦN D — TEST VỚI VÍ RESERVE (Account #4 — `0x1565...4512` — 100,000 VLT)

### D1. Tab Staking
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| D1.1 | Nhập Stake = `50000`, bấm **Stake VLT** | ✅ Thành công | StakingVault.stake |
| D1.2 | Nhập Stake = `60000` (vượt số dư còn lại 50k) | ❌ **Revert** — `ERC20InsufficientBalance` | transferFrom |
| D1.3 | Nhập Unstake = `50000` | ✅ Rút hết về ví | StakingVault.unstake |

### D2. Tab Locker
| # | Hành động | Kết quả mong đợi | Contract |
|---|---|---|---|
| D2.1 | Lock `100000` VLT (toàn bộ) × **365D** | ✅ Lock thành công, ví còn 0 VLT | TokenLocker.lock |
| D2.2 | Lock thêm `1` VLT | ❌ **Revert** — `ERC20InsufficientBalance` (ví hết token) | transferFrom |

### D3. Tab Admin
| # | Hành động | Kết quả mong đợi |
|---|---|---|
| D3.1 | Tất cả nút Admin | ❌ Đều **Revert** — `caller is not admin` |

---

## PHẦN E — FULL-FLOW TEST (End-to-End)

> [!IMPORTANT]
> Đây là kịch bản test toàn bộ luồng từ đầu đến cuối. **Cần reset lại node trước khi test**.

### Bước chuẩn bị
1. Reset: `npm run node` → `npm run deploy:local:reset` → `npm run setup:local`
2. Reset MetaMask activity data cho tất cả account

### Kịch bản E1: Staking → Snapshot → Claim Airdrop

| Bước | Ví | Tab | Hành động | Kết quả |
|---|---|---|---|---|
| 1 | Account #2 | Staking | Stake **50,000 VLT** | ✅ Staked = 50,000 |
| 2 | Account #3 | Staking | Stake **50,000 VLT** | ✅ Staked = 50,000, pool TVL = 100,000 |
| 3 | — | — | **Đợi 2–3 phút** để tích lũy reward | — |
| 4 | Account #2 | Staking | Bấm **Claim Points** | ✅ Points > 0 |
| 5 | Account #3 | Staking | Bấm **Claim Points** | ✅ Points > 0 (tương đương Account #2 vì stake bằng nhau) |
| 6 | Admin (#0) | Admin | Bấm **Snapshot** | ✅ Snapshot ID tăng lên 1 |
| 7 | Account #2 | Airdrop | Nhập Snapshot ID = `0`, bấm **Claim Token** | ✅ Nhận VLT từ Treasury |
| 8 | Account #3 | Airdrop | Nhập Snapshot ID = `0`, bấm **Claim Token** | ✅ Nhận VLT từ Treasury |
| 9 | Account #2 | Airdrop | Claim lại Snapshot `0` | ❌ `already claimed` |
| 10 | Bất kỳ | Admin | Kiểm tra Treasury | Số dư giảm đúng bằng tổng reward đã trả |

### Kịch bản E2: Pause → Chặn User → Unpause

| Bước | Ví | Tab | Hành động | Kết quả |
|---|---|---|---|---|
| 1 | Admin (#0) | Admin | Bấm **Pause** | ✅ Hệ thống tạm dừng |
| 2 | Account #2 | Staking | Stake bất kỳ | ❌ `token transfer while paused` |
| 3 | Account #3 | Locker | Lock bất kỳ | ❌ `token transfer while paused` |
| 4 | Admin (#0) | Admin | Bấm **Unpause** | ✅ Hoạt động lại |
| 5 | Account #2 | Staking | Stake lại | ✅ Thành công |

### Kịch bản E3: Auto-Burn khi Transfer

| Bước | Ví | Tab | Hành động | Kết quả |
|---|---|---|---|---|
| 1 | Admin (#0) | Admin | Set Burn Rate = **1** (= 1% = 100/10000) | ✅ |
| 2 | Account #2 | Staking | Stake **10,000 VLT** | Token thực nhận bởi contract < 10,000 (bị đốt 1%) |
| 3 | — | — | Kiểm tra Total Supply | Giảm đi đúng phần burn | 

> [!NOTE]
> Burn Rate nhập trên UI có thể là % (1-10). Kiểm tra frontend code để xác nhận nó gửi giá trị nào cho `setBurnRate`. Trong contract: 100 = 1%, 1000 = 10%.

---

## PHẦN F — CHECKLIST TỔNG HỢP

### F1. Kiểm tra hiển thị đúng

| # | Mục kiểm tra | Nơi kiểm tra |
|---|---|---|
| F1.1 | Số dư VLT hiển thị đúng trên Header | Tất cả tab |
| F1.2 | Địa chỉ ví hiển thị đúng (rút gọn) | Header |
| F1.3 | Trạng thái "Ready" khi kết nối thành công | Header |
| F1.4 | ETH balance hiển thị đúng (mỗi ví Hardhat có ~10,000 ETH) | Header |
| F1.5 | Treasury balance đúng **200,000** ban đầu | Admin tab |
| F1.6 | Lock #0 Admin hiển thị **300,000 VLT** với ~180 ngày | Locker tab |

### F2. Kiểm tra bảo mật giao diện

| # | Mục kiểm tra | Kết quả mong đợi |
|---|---|---|
| F2.1 | User (non-admin) có thể thấy các nút Admin trên tab Admin | **Nên**: ẩn hoặc disable các nút nếu không phải admin |
| F2.2 | Nhập giá trị âm vào các input | Giao diện chặn hoặc contract revert |
| F2.3 | Nhập text (abc) vào input số | Giao diện chặn, không gửi giao dịch |
| F2.4 | Nhập số thập phân rất nhỏ (0.000001) | Giao dịch thành công (hỗ trợ 18 decimals) |
| F2.5 | Disconnect wallet, thao tác trên UI | Giao diện hiển thị thông báo kết nối ví |
