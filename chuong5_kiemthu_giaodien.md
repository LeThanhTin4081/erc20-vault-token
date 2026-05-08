# CHƯƠNG 5: KIỂM THỬ GIAO DIỆN VÀ MINH CHỨNG HOẠT ĐỘNG TRÊN BLOCKCHAIN

Sau khi hoàn tất việc triển khai hệ thống 7 Smart Contract và kiểm thử đơn vị (Unit Test) ở Chương 4, nhóm tiến hành kiểm thử trực tiếp trên giao diện web (Frontend) kết nối với mạng thử nghiệm Ethereum Sepolia Testnet. Mục đích của chương này là minh chứng rằng toàn bộ hệ thống VaultToken (VLT) hoạt động chính xác trong môi trường Blockchain thực tế — từ việc kết nối ví, thực hiện các giao dịch, cho đến việc xác minh kết quả trên Etherscan.

Giao diện Frontend được xây dựng bằng Next.js, tương tác với các hợp đồng thông minh thông qua ví MetaMask. Toàn bộ quá trình kiểm thử được thực hiện trên mạng Sepolia Testnet với các ví chứa ETH Sepolia (dùng làm phí gas) và token VLT đã được phân bổ theo kế hoạch Tokenomics.

---

## 5.1. Kết nối các ví trên mạng Sepolia Testnet

Bước đầu tiên trong quá trình kiểm thử là xác minh rằng giao diện Frontend có thể kết nối thành công với các ví MetaMask trên mạng Sepolia. Hệ thống VaultToken sử dụng 4 ví chính với các vai trò và số dư khác nhau, phản ánh đúng cơ cấu phân bổ Tokenomics đã thiết kế:

| Ví | Vai trò | Số dư VLT sau phân bổ |
|---|---|---|
| Admin (Deployer) | Quản trị hệ thống | 0 VLT (đã phân bổ hết, 300,000 VLT bị khóa 180 ngày) |
| PublicSale | Người dùng — Bán công khai | 200,000 VLT |
| Seed | Người dùng — Vòng hạt giống | 200,000 VLT |
| Reserve | Người dùng — Quỹ dự trữ | 100,000 VLT |

Khi người dùng mở giao diện web và bấm kết nối ví, MetaMask hiển thị popup yêu cầu xác nhận kết nối. Sau khi chấp nhận, giao diện hiển thị đúng địa chỉ ví (dạng rút gọn), số dư ETH Sepolia (dùng cho phí gas), và số dư token VLT tương ứng với từng ví. Việc kết nối thành công cả 4 ví chứng minh rằng Frontend đã cấu hình đúng mạng Sepolia và đọc được dữ liệu on-chain từ hợp đồng LaunchToken.

*(Chèn ảnh chụp màn hình: Giao diện kết nối ví PublicSale trên Sepolia)*

*(Chèn ảnh chụp màn hình: Giao diện kết nối ví Admin trên Sepolia)*

*(Chèn ảnh chụp màn hình: Giao diện kết nối ví Seed trên Sepolia)*

*(Chèn ảnh chụp màn hình: Giao diện kết nối ví Reserve trên Sepolia)*

---

## 5.2. Kiểm thử ví Admin — Giao dịch thất bại do Token bị khóa

Ví Admin là tài khoản đã triển khai toàn bộ hệ thống. Trong quá trình phân bổ ban đầu, Admin đã chuyển hết 1,000,000 VLT vào các quỹ và các ví, trong đó 300,000 VLT được khóa trong hợp đồng TokenLocker với thời hạn 180 ngày (~160 ngày còn lại tại thời điểm kiểm thử). Do đó, số dư VLT khả dụng của ví Admin bằng 0.

Khi Admin cố thực hiện bất kỳ giao dịch nào yêu cầu token (Stake, Lock thêm, Transfer), hợp đồng từ chối với lỗi `ERC20InsufficientBalance` vì ví không còn token khả dụng. Phần token bị khóa trong TokenLocker chỉ có thể mở khóa (Unlock) sau khi hết hạn 180 ngày — bấm Unlock trước thời hạn sẽ bị từ chối với lỗi `not yet unlocked`.

Kết quả này là hoàn toàn đúng với thiết kế: token của Team bị khóa theo cơ chế Vesting nhằm tạo niềm tin cho cộng đồng rằng đội ngũ phát triển không thể bán tháo token ngay sau khi ra mắt.

*(Chèn ảnh chụp màn hình: Giao diện ví Admin trên Sepolia — hiển thị 0 VLT khả dụng)*

*(Chèn ảnh chụp màn hình: Giao dịch thất bại khi Admin cố thao tác với token — lỗi InsufficientBalance hoặc not yet unlocked)*

---

## 5.3. Kiểm thử ví PublicSale — Các thao tác chính

Ví PublicSale sở hữu 200,000 VLT và đóng vai trò người dùng chính trong quá trình kiểm thử. Đây là ví được sử dụng để test toàn bộ các chức năng cốt lõi của hệ thống: Lock, Stake, Claim Points và nhận thưởng Airdrop.

Khi kết nối ví PublicSale và truy cập giao diện, hệ thống hiển thị đầy đủ thông tin: địa chỉ ví, số dư 200,000 VLT, vai trò User (không phải Admin), và trạng thái hệ thống đang hoạt động bình thường.

*(Chèn ảnh chụp màn hình: Giao diện tổng quan ví PublicSale trên Sepolia — hiển thị 200,000 VLT)*

### 5.3.1. Lock 1,000 VLT trong 365 ngày

Chức năng Token Locker cho phép người dùng khóa token của mình trong một khoảng thời gian xác định. Ví PublicSale thực hiện khóa 1,000 VLT với thời hạn 365 ngày. Quy trình diễn ra 2 bước:

1. **Approve:** MetaMask hiển thị popup yêu cầu cấp quyền cho hợp đồng TokenLocker sử dụng 1,000 VLT từ ví.
2. **Lock:** Sau khi Approve thành công, MetaMask hiển thị popup xác nhận giao dịch Lock. Khi block được xác nhận trên Sepolia, giao diện cập nhật danh sách Locks với bản ghi mới: 1,000 VLT khóa trong 365 ngày.

Sau khi Lock thành công, số dư ví PublicSale giảm từ 200,000 xuống 199,000 VLT. Phần token bị khóa không thể chuyển đi hay sử dụng cho đến khi hết hạn 365 ngày. Giao dịch Lock được ghi nhận vĩnh viễn trên Blockchain Sepolia và có thể tra cứu trên Etherscan.

*(Chèn ảnh chụp màn hình: Giao diện nhập Lock 1,000 VLT — chọn 365 ngày)*

*(Chèn ảnh chụp màn hình: MetaMask popup xác nhận giao dịch Lock)*

*(Chèn ảnh chụp màn hình: Giao diện hiển thị Lock thành công — danh sách Locks cập nhật)*

### 5.3.2. Staking 10,000 VLT thành công

Chức năng Staking cho phép người dùng gửi token vào hợp đồng StakingVault để nhận phần thưởng tích lũy theo thời gian dưới dạng điểm Airdrop. Ví PublicSale thực hiện Stake 10,000 VLT. Tương tự Lock, quy trình gồm 2 bước Approve và Stake.

Sau khi Stake thành công:
- Số dư ví giảm từ 199,000 xuống 189,000 VLT (đã trừ 1,000 VLT Lock trước đó).
- Mục Staked trên giao diện hiển thị 10,000 VLT.
- Tổng giá trị khóa (TVL — Total Value Locked) của StakingVault tăng tương ứng.
- Giá trị Pending Rewards bắt đầu tích lũy theo thời gian.

Giao dịch Stake tạo ra 2 bản ghi trên Etherscan: một giao dịch Approve và một giao dịch gọi hàm `stake()` trên StakingVault, kèm theo sự kiện `Staked(user, amount)`.

*(Chèn ảnh chụp màn hình: Giao diện nhập Stake 10,000 VLT)*

*(Chèn ảnh chụp màn hình: Giao dịch Stake thành công — Staked = 10,000, Wallet giảm)*

*(Chèn ảnh chụp màn hình: Etherscan — giao dịch Stake trên Sepolia)*

### 5.3.3. Lịch sử Unstake Token

Sau khi đã Stake, người dùng có thể rút một phần hoặc toàn bộ token đã stake bằng chức năng Unstake. Khi thực hiện Unstake, hợp đồng StakingVault tự động tính toán và cộng phần thưởng tích lũy (Pending Rewards) vào điểm Airdrop trước khi trả token về ví người dùng.

Giao dịch Unstake được ghi nhận trên Etherscan với sự kiện `Unstaked(user, amount)`. Tab Token Transfers cho thấy dòng token di chuyển từ địa chỉ hợp đồng StakingVault trở lại ví người dùng — xác minh rằng token thực sự được trả lại chứ không bị giữ lại trong hệ thống.

*(Chèn ảnh chụp màn hình: Giao diện Unstake thành công — số dư ví tăng lại)*

*(Chèn ảnh chụp màn hình: Etherscan — lịch sử giao dịch Unstake trên Sepolia)*

---

## 5.4. Admin Snapshot — Chốt sổ điểm Airdrop

Sau khi các ví User đã Stake và tích lũy đủ Pending Rewards, Admin thực hiện thao tác Snapshot trên Tab Admin. Snapshot là hành động "chốt sổ" — ghi lại toàn bộ số điểm Airdrop hiện tại của tất cả người dùng vào một bản ghi bất biến (immutable) trên Blockchain. Mỗi lần Snapshot tạo ra một Epoch ID mới (bắt đầu từ 0).

Khi Admin bấm Snapshot:
- MetaMask hiển thị popup xác nhận giao dịch gọi hàm `snapshot()` trên hợp đồng AirdropPoints.
- Sau khi block được xác nhận, giá trị `currentSnapshotId` tăng lên 1.
- Sự kiện `SnapshotTaken(epochId)` được phát ra và ghi nhận trên Etherscan.

Snapshot là điều kiện tiên quyết để người dùng có thể Claim Airdrop. Chỉ Admin (người có `ADMIN_ROLE` trong AccessManager) mới có quyền thực hiện Snapshot — nếu User thường cố gọi hàm này, giao dịch sẽ bị từ chối với lỗi `caller is not admin`.

*(Chèn ảnh chụp màn hình: Admin bấm Snapshot thành công trên giao diện)*

*(Chèn ảnh chụp màn hình: Etherscan — giao dịch Snapshot trên Sepolia)*

---

## 5.5. Claim Points — Các ví User nhận điểm Staking

Trước khi có thể nhận thưởng token VLT qua Airdrop, người dùng cần thực hiện Claim Points để chuyển đổi Pending Rewards (phần thưởng tích lũy từ Staking) thành điểm Airdrop chính thức. Điểm này được lưu trữ trong hợp đồng AirdropPoints và sẽ được dùng để tính toán số token thưởng khi Claim Airdrop.

Khi User bấm Claim Points trên Tab Staking:
- Hợp đồng StakingVault tính toán số Pending Rewards dựa trên thời gian Stake và tỷ lệ trong pool.
- StakingVault gọi hàm `addPoints()` trên AirdropPoints để cộng điểm cho người dùng.
- Giá trị Pending Rewards reset về xấp xỉ 0, giá trị Points tăng lên tương ứng.

Mỗi ví User (PublicSale, Seed, Reserve) đều thực hiện Claim Points để ghi nhận điểm trước khi Admin thực hiện Snapshot. Số điểm nhận được tỷ lệ thuận với số lượng token đã Stake và thời gian giữ Stake trong pool.

*(Chèn ảnh chụp màn hình: Ví PublicSale bấm Claim Points — điểm tăng lên)*

*(Chèn ảnh chụp màn hình: Ví Seed bấm Claim Points — điểm tăng lên)*

*(Chèn ảnh chụp màn hình: Etherscan — giao dịch Claim Points trên Sepolia)*

---

## 5.6. Nhận thưởng Token VLT — Claim Airdrop

Sau khi Admin đã thực hiện Snapshot và các ví User đã có điểm, người dùng có thể Claim Airdrop để nhận token VLT thật về ví. Đây là bước cuối cùng trong vòng đời Staking → Tích điểm → Snapshot → Nhận thưởng.

Khi User bấm Claim Token trên Tab Airdrop:
- Người dùng nhập Snapshot ID (Epoch ID) tương ứng với đợt Snapshot đã chốt.
- Hợp đồng AirdropDistributor tra cứu điểm của người dùng tại Epoch đó từ AirdropPoints.
- AirdropDistributor tính toán số token thưởng (reward = points × tỷ lệ quy đổi) và rút token từ quỹ Treasury để chuyển về ví người dùng.
- Giao dịch phát ra sự kiện `Claimed(user, epochId, reward)`.

Cơ chế chống Double-Claim đảm bảo rằng mỗi người dùng chỉ có thể Claim một lần duy nhất cho mỗi Snapshot ID. Nếu Claim lần thứ hai với cùng Epoch ID, giao dịch bị từ chối với lỗi `already claimed`.

*(Chèn ảnh chụp màn hình: Ví PublicSale Claim Airdrop thành công — nhận VLT về ví)*

*(Chèn ảnh chụp màn hình: Ví Seed Claim Airdrop thành công — nhận VLT về ví)*

*(Chèn ảnh chụp màn hình: Etherscan — giao dịch Claim Airdrop trên Sepolia)*

---

## 5.7. Xác minh số dư ví sau khi nhận thưởng Staking

Sau khi các ví User hoàn tất Claim Airdrop, nhóm kiểm tra lại số dư token VLT của từng ví trên cả giao diện Frontend và Etherscan để đảm bảo rằng token được phân phối chính xác.

Số dư ví sau khi nhận thưởng phải thỏa mãn công thức:

> **Số dư cuối = Số dư ban đầu − Số đã Stake − Số đã Lock + Số đã Unstake + Reward Airdrop**

Trên Etherscan, tab "Token Transfers" của từng ví hiển thị toàn bộ lịch sử giao dịch token: từ lúc nhận phân bổ ban đầu, qua các giao dịch Stake/Unstake/Lock, đến khi nhận Airdrop. Tab "Token Holdings" hiển thị số dư VLT hiện tại — cho phép đối chiếu trực tiếp với giao diện Frontend.

Đồng thời, kiểm tra số dư của hợp đồng Treasury để xác nhận rằng tổng số token đã trả cho các ví User khớp với số lượng giảm trong Treasury:

> **Treasury sau = Treasury ban đầu (200,000 VLT) − Tổng reward đã trả**

*(Chèn ảnh chụp màn hình: Giao diện Frontend — số dư ví PublicSale sau khi nhận thưởng)*

*(Chèn ảnh chụp màn hình: Etherscan — trang địa chỉ ví PublicSale với Token Holdings)*

*(Chèn ảnh chụp màn hình: Etherscan — trang địa chỉ ví Seed với Token Holdings)*

*(Chèn ảnh chụp màn hình: Etherscan — số dư Treasury sau khi trả thưởng)*

---

## 5.8. Thay đổi tỷ lệ Auto-Burn từ 5% xuống 0%

Hệ thống VaultToken tích hợp cơ chế Auto-Burn: mỗi khi có giao dịch chuyển token (Transfer), một tỷ lệ phần trăm token sẽ tự động bị đốt (burn) — giảm vĩnh viễn khỏi tổng cung (Total Supply). Tỷ lệ burn có thể được Admin điều chỉnh từ 0% đến tối đa 10% thông qua hàm `setBurnRate()` trên hợp đồng LaunchToken.

Tại thời điểm kiểm thử, tỷ lệ burn đang ở mức 5%. Admin thực hiện thay đổi burn rate xuống 0% để tắt hoàn toàn cơ chế đốt token:

1. Admin kết nối ví trên Tab Admin.
2. Nhập giá trị Burn Rate mới = 0 (tương ứng 0%).
3. Bấm Apply — MetaMask hiển thị popup xác nhận giao dịch gọi hàm `setBurnRate(0)`.
4. Sau khi block được xác nhận, giao diện cập nhật Burn Rate = 0%.

Giao dịch này được ghi nhận trên Etherscan, cho phép cộng đồng theo dõi bất kỳ thay đổi nào về chính sách burn của dự án một cách minh bạch.

*(Chèn ảnh chụp màn hình: Giao diện Admin — Burn Rate đang ở 5% trước khi thay đổi)*

*(Chèn ảnh chụp màn hình: Admin nhập Burn Rate = 0 và bấm Apply)*

*(Chèn ảnh chụp màn hình: Etherscan — giao dịch setBurnRate trên Sepolia)*

### 5.8.1. Kiểm tra sau khi thay đổi tỷ lệ Burn xuống 0%

Sau khi tỷ lệ burn được đặt về 0%, nhóm thực hiện một giao dịch Transfer token để xác minh rằng cơ chế burn đã thực sự bị vô hiệu hóa:

- **Trước khi thay đổi (Burn Rate = 5%):** Khi chuyển 1,000 VLT, người nhận chỉ nhận được 950 VLT (5% = 50 VLT bị đốt), và Total Supply giảm đi 50 VLT.
- **Sau khi thay đổi (Burn Rate = 0%):** Khi chuyển 1,000 VLT, người nhận nhận đủ 1,000 VLT, Total Supply không thay đổi.

Kiểm tra trên Etherscan:
- Tab Events của giao dịch Transfer trước khi thay đổi có cả sự kiện `Transfer` lẫn sự kiện `Burn`.
- Tab Events của giao dịch Transfer sau khi thay đổi chỉ có sự kiện `Transfer`, không có `Burn`.
- Giá trị `totalSupply()` trên Read Contract phản ánh đúng: không giảm thêm sau khi tắt burn.

Kết quả xác nhận rằng Admin có khả năng điều chỉnh linh hoạt chính sách Auto-Burn trong thời gian thực, và thay đổi có hiệu lực ngay lập tức cho mọi giao dịch sau đó.

*(Chèn ảnh chụp màn hình: Giao diện Admin — Burn Rate = 0% sau khi thay đổi)*

*(Chèn ảnh chụp màn hình: Giao dịch Transfer sau khi Burn Rate = 0% — người nhận nhận đủ token)*

*(Chèn ảnh chụp màn hình: Etherscan — Read Contract totalSupply không giảm thêm)*

---

> **Ghi chú cho người viết:** Tại mỗi vị trí ghi *"Chèn ảnh chụp màn hình..."*, hãy thay thế bằng ảnh chụp thực tế khi thao tác trên giao diện Frontend hoặc tra cứu trên https://sepolia.etherscan.io. Mỗi ảnh nên có caption (chú thích) được đánh số liên tục, ví dụ: "Hình 5.1. Giao diện kết nối ví PublicSale trên mạng Sepolia Testnet".
