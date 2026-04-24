# PHÂN CHIA CÔNG VIỆC DỰ ÁN TOKEN ERC-20 VÀ DEFI (TEAM 5 NGƯỜI)

_Ghi chú: Toàn bộ 5 thành viên ĐỀU TRỰC TIẾP CODE CÁC HỢP ĐỒNG (tổng 7 hợp đồng) và tự viết Unit Test cho code của mình. Về phần Báo cáo Word (đồ án/tiểu luận), TV1 được miễn viết. Khối lượng viết Word của TV3, 4, 5 sẽ nhiều hơn TV2 để bù trừ do chỉ code 1 contract._

---

## 🌟 Sơ đồ khối lượng công việc

|    Thành viên    | Khối Code (Contract)           | Số lượng Test | Báo cáo Word (Tiểu luận)                                                                                   |
| :--------------: | :----------------------------- | :-----------: | :--------------------------------------------------------------------------------------------------------- |
| **NAM (Leader)** | `AccessManager`, `LaunchToken` |  2 file test  | **(ko viet docs)** Tập trung review code, Setup Repo & viết lệnh DeploySystem.                             |
|     **TIN**      | `Treasury`, `TokenLocker`      |  2 file test  | **Phần nhẹ:** Soạn Cơ sở lý thuyết ngắn gọn, lập bảng Tokenomics.                                          |
|     **HẬU**      | `StakingVault`                 |  1 file test  | **Phần nặng:** Phân tích yêu cầu, Thiết kế kiến trúc, vẽ UML toàn hệ thống.                                |
|     **VINH**     | `AirdropPoints`                |  1 file test  | **Phần nặng:** Trình bày chi tiết luồng Snapshot, cơ chế điểm On-chain, Chụp hình cấu trúc dự án.          |
|    **TRÌNH**     | `AirdropDistributor`           |  1 file test  | **Phần nặng:** Viết luận về Reentrancy, Báo cáo kịch bản Test, báo cáo Deploy Sepolia & Chỉnh format cuối. |

---

## 🛠️ Chi tiết nhiệm vụ từng người

### 👤 Thành viên 1: Core Developer & Setup

_Trách nhiệm cực kỳ quan trọng ở khâu tạo khung, code 2 hợp đồng, nhưng không cực ở khâu gõ Word chữ._

- **Code (2 Contract):** `AccessManager.sol` (RBAC) và `LaunchToken.sol` (Mint/Burn).
- **Test (2 File):** Tự viết Unit Test cho 2 file chuẩn OpenZeppelin này.
- **Nhiệm vụ chung:** Cấu hình gốc dự án (`npx hardhat init`), quản lý Github, viết `DeploySystem.ts` để gộp toàn bộ 7 file vào một lệnh deploy đồng bộ. Duyệt Merge Pull Request cho cả nhóm. Không viết Word.

### 👤 Thành viên 2: Fund & Locker Developer

_Là người code nhiều thứ 2 trong nhóm (2 hợp đồng) nên chỉ bị gán một ít khối lượng viết báo cáo._

- **Code (2 Contract):** `Treasury.sol` (Két sắt hệ thống) và `TokenLocker.sol` (Khóa token theo hạn).
- **Test (2 File):** Viết Unit Test cho cả hai, đảm bảo không thể rút hoặc unlock sai điều kiện.
- **Báo cáo Word (1 Phần ít):** Viết nhanh **Chương 1**, điền bảng phân bổ token (Tokenomics: 30% Team, 20% quỹ...) và định nghĩa các khái niệm ERC-20, Hardhat ngắn gọn.

### 👤 Thành viên 3: DeFi Logic Developer

_Chỉ code 1 hợp đồng nhưng phải gánh phần vẽ sơ đồ, phân tích hệ thống rất nặng trong Word._

- **Code (1 Contract):** `StakingVault.sol` (Hàm stake, unstake).
- **Test (1 File):** Viết Unit Test test logic cộng/trừ điểm và gọi mock-up.
- **Báo cáo Word (1 Phần nhiều):** Lo toàn bộ **Chương 2** (Thiết kế hệ thống). Phải dùng phần mềm (Draw.io, Visio) vẽ sơ đồ Use-Case (Tác nhân người dùng và admin), vẽ sơ đồ State Machine (Các trạng thái của hệ thống), và luồng hoạt động chuyển tiền/nhận điểm.

### 👤 Thành viên 4: Point Accounting Developer

_Cũng chỉ code 1 hợp đồng, chịu trách nhiệm lo các nội dung diễn giải luồng và chụp hình minh chứng._

- **Code (1 Contract):** `AirdropPoints.sol` (Quản lý điểm và Snapshot).
- **Test (1 File):** Viết Unit Test kiểm tra các hàm addPoint bảo mật và lưu epoch.
- **Báo cáo Word (1 Phần nhiều):** Lo toàn bộ **Chương 3**. Giải thích vì sao dự án tách riêng tiền và điểm ra hai hợp đồng khác nhau. Chụp hình cấu trúc source code dán vào báo cáo, diễn giải chi tiết cái "Invariants" (các ràng buộc) như cấm stake trước launch.

### 👤 Thành viên 5: Distributor & Tester Master

_Code 1 hợp đồng phát tiền, lo nốt phần khó nhất của luận văn: Phân tích hack và thống kê test._

- **Code (1 Contract):** `AirdropDistributor.sol` (Hàm claim tiền, kiểm tra điểm).
- **Test (1 File):** Viết Unit Test ngăn chặn Double Claim.
- **Báo cáo Word (1 Phần nhiều):** Trình bày kỹ thuật bảo vệ ReentrancyGuard, chụp toàn bộ dòng chữ xanh báo Pass 100% khi chạy lệnh `npx hardhat test`. Biên soạn phần nhật ký triển khai lên mạng Testnet Sepolia thật. Chỉnh lại bìa và format văn bản trước khi nộp Thầy.

---

## 🏃‍♂️ Quy trình thao tác với GitHub (BẮT BUỘC ĐỂ KHÔNG CHÁY PROJECT)

Tuyệt đối **không ai được push thẳng lệnh vào nhánh `main`**. Hãy làm theo quy chuẩn sau:

**1. Khởi tạo (Chỉ dành cho Thành viên 1):**

- Đẩy khung sườn rỗng (Skeleton) lên nhánh `main`.
- Add quyền Collaborator cho 4 bạn vào Repo.

**2. Bắt tay làm việc (Dành cho mọi người - TV 2,3,4,5):**

- Kéo source về máy: `git clone [link-repo]`.
- BẮT BUỘC TẠO NHÁNH MỚI trước khi gõ Code:
  - Ví dụ lệnh cho TV2: `git checkout -b feature/locker`
- Sau khi code và tự test xong ở máy, bắt đầu lưu file:
  - `git add .`
  - `git commit -m "TV2: Hoan thanh code va test Treasury"`

**3. Đẩy code lên Github:**

- `git push origin [tên-nhánh-của-mình]` (VD: `git push origin feature/locker`)

**4. Xét duyệt và Gộp Code (Pull Request - PR):**

- Vào Github, bấm Create Pull Request để gom nhánh của bạn vô nhánh `main`.
- **LUẬT THÉP:** Không ai được tự bấm Merge PR của mình!
- Phải hú **Nhóm trưởng (TV 1)** hoặc người khác vào đọc code (Review).
- CÓ CONFLICT (Bị đụng dòng code do người khác sửa chung): File báo dấu chéo đỏ, bạn phải tự sửa tay rồi commit lại.
- Xong xui hết, **TV 1** mới là người bấm nút xanh **Merge Pull Request**.

**5. Bước tiếp theo:**

- Phải làm mới lại code base mỗi phi chuẩn bị làm tiếp: gõ `git checkout main` -> `git pull origin main`.
