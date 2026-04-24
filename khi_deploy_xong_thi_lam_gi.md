# QUY TRÌNH VẬN HÀNH HỆ THỐNG SAU KHI DEPLOY

> Tài liệu này hướng dẫn chi tiết các bước cần thực hiện NGAY SAU KHI chạy lệnh deploy thành công lên mạng lưới (Local, Sepolia hoặc Mainnet). Đây là cuốn cẩm nang để team Dev và Admin biết phải làm gì tiếp theo.

---

## BƯỚC 1: LƯU TRỮ ĐỊA CHỈ HỢP ĐỒNG (Contract Addresses)

Ngay khi lệnh deploy chạy xong, màn hình Terminal sẽ in ra một danh sách các địa chỉ bắt đầu bằng `0x...`.
Đây là "địa chỉ nhà" của các hợp đồng trên mạng Blockchain.

**Nhiệm vụ:**
1. Copy toàn bộ các địa chỉ này.
2. Lưu vào một file tên là `contract-addresses.txt` hoặc cập nhật thẳng vào file `.env` của dự án Frontend.
3. Gửi danh sách này cho team Frontend để họ biết đường kết nối Web3.

*(Ví dụ: LaunchToken Address: 0x123...abc)*

---

## BƯỚC 2: XÁC MINH MÃ NGUỒN (Verify Smart Contract)

Nếu bạn deploy lên **Sepolia** hoặc **Mainnet**, mã nguồn trên mạng lưới lúc này chỉ là mã máy (Bytecode) không ai đọc được. Bạn phải "Verify" để hiển thị code Solidity xanh lá cây trên Etherscan, giúp cộng đồng tin tưởng dự án.

**Nhiệm vụ:** Chạy lệnh verify cho từng hợp đồng.
```bash
# Cú pháp ví dụ cho LaunchToken (cần điền đúng địa chỉ của AccessManager đã truyền vào constructor)
npx hardhat verify --network sepolia <ĐỊA_CHỈ_LAUNCH_TOKEN> <ĐỊA_CHỈ_ACCESS_MANAGER>
```
*Lưu ý: Bạn phải có `ETHERSCAN_API_KEY` trong file `.env` mới làm được bước này.*

---

## BƯỚC 3: THIẾT LẬP QUYỀN VÀ PHÂN BỔ VỐN (Admin Setup)

Hợp đồng đẩy lên mạng xong giống như một cái két sắt mới tinh, Admin phải là người thiết lập luật chơi ban đầu trước khi mở cửa cho cộng đồng.

**Nhiệm vụ của Admin (Ví Deployer):**

1. **Cấp quyền (Grant Roles):** 
   - Gọi hàm `grantRole(VAULT_ROLE, <ĐỊA_CHỈ_STAKING_VAULT>)` trên `AccessManager`.
   - Cấp quyền MINTER cho ai có trách nhiệm in token (nếu cần).
   
2. **Nạp Ngân khố (Treasury):**
   - Lấy một phần trong 1.000.000 token ban đầu, gọi hàm `transfer()` chuyển vào địa chỉ của `Treasury`.
   - Gọi `approveSpender()` để cho phép `AirdropDistributor` được quyền rút tiền từ két đi phát Airdrop.

3. **Khóa vốn Team (TokenLocker):**
   - Admin gọi hàm `approve()` cho phép `TokenLocker` giữ token.
   - Gọi hàm `lock()` để khóa số token của team Dev trong 6 tháng - 1 năm.

4. **MỞ GIAO DỊCH (Open Trading):**
   - Gọi hàm `openTrading()` trong `LaunchToken`.
   - **Tác dụng:** Chính thức cho phép người dân tự do chuyển token, mua bán trên các sàn DEX. Trước bước này, hệ thống bật chế độ Anti-Bot (khóa mọi giao dịch của dân thường).

---

## BƯỚC 4: BÀN GIAO CHO FRONTEND (DApp Integration)

Team Frontend không thể tự hiểu Blockchain, họ cần 2 thứ từ team Smart Contract (Backend):

1. **Danh sách Contract Addresses** (Đã lấy ở Bước 1).
2. **File ABI (Application Binary Interface):**
   - Vào thư mục `artifacts/contracts/.../Tên_Hợp_Đồng.json`.
   - Copy các file JSON này gửi cho team Frontend.
   - Bằng file ABI, Frontend sẽ biết hợp đồng có những hàm gì (vd: `deposit()`, `lock()`) để tạo nút bấm trên giao diện React/Next.js.

---

## BƯỚC 5: KIỂM THỬ END-TO-END (Thử nghiệm thực tế)

Trước khi công bố dự án (Marketing):
1. Team mở giao diện Web Frontend vừa kết nối xong.
2. Dùng ví MetaMask phụ (đóng vai user) vào web bấm thử nút Staking, nạp rút, claim Airdrop.
3. Check lại trên Sepolia Etherscan xem số dư có nhảy đúng như lý thuyết không.

🎉 **HOÀN TẤT DỰ ÁN! CHUẨN BỊ LÊN MAINNET VÀ THU TIỀN!** 🎉
