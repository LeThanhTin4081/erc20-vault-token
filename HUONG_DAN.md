# TỔNG HỢP CÁC LỆNH HARDHAT VÀ KIẾN THỨC TERMINAL TRONG SOLIDITY

Dưới đây là cẩm nang tổng hợp các lệnh Hardhat từ cơ bản đến nâng cao, dùng khi code Smart Contract bằng Solidity. Mọi thao tác này đều chạy trên Terminal (Command Prompt / PowerShell / VS Code Terminal).

---

## ⚠️ 1. LÀM GÌ KHI VỪA CẬP NHẬT CODE TỪ GIT VỀ? (QUAN TRỌNG NHẤT DÀNH CHO TEAM)

Mỗi khi thành viên khác push code, bạn lấy code mới nhất về máy (bằng cách clone hoặc `git pull`), **ĐỪNG VỘI VÀNG BIÊN DỊCH HAY CHẠY TEST**. Tác vụ đầu tiên bắt buộc phải làm là cài đặt hoặc đồng bộ các gói bổ trợ mà nhóm đã thêm vào.

**Chạy lệnh này ngay lập tức:**
```cmd
npm install
```

> ❓ **Lỡ máy thành viên khác chưa cài Hardhat hay thư viện OpenZeppelin thì sao?**
> 👉 **Trả lời:** KHÔNG CẦN CÀI LẠI! Lệnh `npm install` ở trên sẽ tự động lục tìm file `package.json` do trưởng nhóm đã làm sẵn và tải **đầy đủ 100%** mọi cấu hình từ Hardhat, OpenZeppelin... về máy cho các bạn. Các thành viên trong nhóm tuyệt đối **KHÔNG tự ý gõ lại** lệnh khởi tạo Hardhat nữa để tránh gây xung đột dự án.

---

## 🏗️ 2. KHỞI TẠO VÀ CÀI ĐẶT

### Khởi tạo project mới (Chỉ dành cho dự án trống)
```cmd
npm init -y
npm install --save-dev hardhat
npx hardhat init
```
*(Nếu làm theo team, TV1 đã thực hiện lệnh này, các TV khác KHÔNG chạy lại).*

### Cài đặt thư viện chuẩn OpenZeppelin (ERC20, ERC721, ...):
```cmd
npm install @openzeppelin/contracts
```

---

## 🛠️ 2. BIÊN DỊCH VÀ KIỂM TRA LỖI (COMPILE)

### Biên dịch toàn bộ Smart Contracts:
```cmd
npx hardhat compile
```
Lệnh này sẽ biến đổi code `.sol` thành `artifacts/` (chứa ABI) và `cache/`.

### Xóa bộ nhớ đệm và biên dịch lại từ đầu:
Nếu dự án gặp lỗi ảo không rõ nguyên nhân, hãy làm sạch dự án:
```cmd
npx hardhat clean
npx hardhat compile
```

---

## 🧪 3. CHẠY KỊCH BẢN KIỂM THỬ (TEST)

### Chạy tất cả các unit test trong folder `test/`:
```cmd
npx hardhat test
```

### Chạy một file test cụ thể:
```cmd
npx hardhat test test/VaultToken.test.ts
```

### Chạy test và tạo báo cáo Gas (Gas Reporter):
Lưu ý phải bật config `gasReporter` trong `hardhat.config.ts`.
```cmd
REPORT_GAS=true npx hardhat test
```

---

## 🚀 4. DEPLOY (TRIỂN KHAI LÊN BLOCKCHAIN)

### Khởi chạy một Blockchain nội bộ cục bộ (Local Node):
```cmd
npx hardhat node
```
*(Mở tab terminal mới để chạy lệnh deploy dưới đây, giữ nguyên tab này).*

### Deploy bằng Scripts lên mạng Local (Hardhat Node/Ganache):
```cmd
npx hardhat run scripts/deploy.ts --network localhost
```

### Deploy lên mạng Testnet thực tế (vd: Sepolia):
Yêu cầu đã cấu hình URL RPC (Alchemy/Infura) và `PRIVATE_KEY` trong file `.env` & `hardhat.config.ts`.
```cmd
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## 🔐 5. XÁC THỰC MÃ NGUỒN (VERIFY CONTRACT) TRÊN ETHERSCAN

Để chứng minh hợp đồng của bạn trong sạch trên Block Explorer (ví dụ: Sepolia Etherscan), bạn cần Verify mã nguồn:

*(Cập nhật khóa API Etherscan vào file `.env` trước).*

### Verify Contract:
```cmd
npx hardhat verify --network sepolia <ĐỊA_CHỈ_CONTRACT_SAU_KHI_DEPLOY> "tham_số_constructor_1" "tham_số_constructor_2"
```

---

## ⚙️ 6. CÁC LỆNH TIỆN ÍCH KHÁC

### Mở Hardhat Console (Tương tác trực tiếp với Contract):
```cmd
npx hardhat console --network localhost
```
Trong console, bạn có thể chạy code javascript với thư viện ethers để truy vấn contract.

### In ra danh sách tất cả các tài khoản mặc định của Hardhat:
Tùy thuộc vào code trong file `hardhat.config.ts`, bạn có thể kiểm tra danh sách accounts:
```cmd
npx hardhat accounts
```

---

## 💡 MẸO QUAN TRỌNG KHI LÀM VIỆC THEO TEAM
- Mỗi khi ai đó push code mới lên GitHub, khi clone hoặc pull về, hãy luôn chạy `npm install` để cài đặt đủ Package trước khi compile.
- KHÔNG bao giờ commit file `.env` lên GitHub (hãy chắc chắn `.env` nằm trong `.gitignore`).
- Khi gặp lỗi lạ, combo chữa cháy luôn là:
  `npx hardhat clean` -> `npx hardhat compile`.
