
# LỆNH TERMINAL — Dự án VaultToken ERC-20

> Tất cả lệnh chạy tại thư mục gốc dự án: `c:\Users\ADMIN\Documents\CODE\blockchain`

---

## 1. Lệnh Hardhat (Code Solidity)

| Lệnh | Mô tả | Khi nào dùng |
|-------|--------|-------------|
| `npx hardhat compile` | Biên dịch toàn bộ file `.sol` trong thư mục `contracts/` | Sau khi sửa code Solidity, kiểm tra cú pháp |
| `npx hardhat test` | Chạy toàn bộ test trong thư mục `test/` (tự compile trước) | Kiểm tra logic đúng/sai |
| `npx hardhat test test/TokenLocker.test.ts` | Chạy 1 file test cụ thể | Chỉ muốn test 1 contract |
| `npx hardhat test --grep "lock"` | Chạy các test có tên chứa "lock" | Lọc test theo từ khóa |
| `npx hardhat clean` | Xóa cache + artifacts đã compile | Khi bị lỗi lạ, compile lại từ đầu |
| `npx hardhat node` | Chạy 1 blockchain giả lập trên máy (localhost:8545) | Test thủ công hoặc deploy local |

---

## 2. Lệnh Deploy (Hardhat Ignition)

| Lệnh | Mô tả | Khi nào dùng |
|-------|--------|-------------|
| `npx hardhat ignition deploy ./ignition/modules/DeploySystem.ts --network hardhatMainnet` | Deploy lên mạng local (giả lập) | Test deploy trước khi lên testnet |
| `npx hardhat ignition deploy ./ignition/modules/DeploySystem.ts --network sepolia` | Deploy lên Sepolia testnet (thật) | Khi code đã ổn, muốn deploy lên mạng thật |

> **Lưu ý:** Trước khi deploy lại trên local, cần xóa thư mục cũ: `rm -rf ignition/deployments/chain-31337`

---

## 3. Lệnh Git (Quản lý code nhóm)

| Lệnh | Mô tả | Khi nào dùng |
|-------|--------|-------------|
| `git status` | Xem file nào đã thay đổi | Trước khi commit, kiểm tra |
| `git add .` | Đánh dấu tất cả file thay đổi để chuẩn bị commit | Trước khi commit |
| `git commit -m "TV2: mô tả ngắn"` | Lưu thay đổi vào lịch sử git | Sau khi code + test xong |
| `git push origin tin` | Đẩy code lên GitHub (branch tin) | Sau khi commit |
| `git pull origin main` | Kéo code mới nhất từ main về | Trước khi bắt đầu code mới |
| `git checkout main` | Chuyển về nhánh main | Khi cần xem code gốc |
| `git checkout tin` | Chuyển về nhánh tin | Quay lại nhánh của mình |
| `git log -n 5` | Xem 5 commit gần nhất | Kiểm tra lịch sử |
| `git diff` | Xem chi tiết thay đổi chưa commit | Review code trước khi commit |

---

## 4. Lệnh NPM (Quản lý package)

| Lệnh | Mô tả | Khi nào dùng |
|-------|--------|-------------|
| `npm install` | Cài toàn bộ package trong package.json | Lần đầu clone repo, hoặc khi package.json thay đổi |
| `npm install @openzeppelin/contracts` | Cài thêm package mới | Khi cần thêm thư viện |

---

## 5. Quy trình thường ngày (Workflow)

### Khi bắt đầu code:
```bash
git checkout tin
git pull origin main
```

### Khi đang code (kiểm tra từng bước):
```bash
npx hardhat compile
```

### Khi code + test xong:
```bash
npx hardhat test
```

### Khi muốn push lên GitHub:
```bash
git add .
git commit -m "TV2: Hoan thanh TokenLocker va test"
git push origin tin
```

### Khi bị lỗi compile lạ:
```bash
npx hardhat clean
npx hardhat compile
```

---

## 6. Lệnh hữu ích khác

| Lệnh | Mô tả |
|-------|--------|
| `npx hardhat console --network hardhatMainnet` | Mở console tương tác với blockchain local |
| `npx hardhat help` | Xem danh sách tất cả lệnh Hardhat |
| `npx hardhat test --verbose` | Chạy test với log chi tiết hơn |
