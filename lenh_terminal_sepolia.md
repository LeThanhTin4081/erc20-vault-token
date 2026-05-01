# Các lệnh Terminal để Deploy lên mạng Sepolia Testnet

> ⚠️ **Lưu ý quan trọng trước khi bắt đầu:**
> Đảm bảo file `.env` đã có đủ 3 thông tin: `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` (ví này phải có sẵn ETH Sepolia làm phí gas), và `ETHERSCAN_API_KEY`.

---

## BƯỚC 1: Deploy Smart Contracts lên Sepolia
*Mở terminal tại thư mục `blockchain`*

```powershell
# Chạy lệnh deploy (Luôn dùng --reset để ghi đè bản cũ, gõ 'y' khi được hỏi)
npx hardhat ignition deploy ./ignition/modules/DeploySystem.ts --network sepolia --reset
```
*(Mạng thật sẽ chạy chậm hơn Local, bạn hãy kiên nhẫn đợi khoảng 1-3 phút để các block được xác nhận nhé)*

---

## BƯỚC 2: Verify Source Code (Để code hiện xanh lá trên Etherscan)
Sau khi deploy xong, Hardhat Ignition đã tự động lưu lại thông tin. Bạn chỉ cần chạy 1 lệnh duy nhất này để hệ thống tự động verify toàn bộ 7 contract:

```powershell
npx hardhat ignition verify chain-11155111 --network sepolia
```
*(Chain ID của Sepolia là 11155111. Nếu báo Successfully verified là thành công!)*

---

## BƯỚC 3: Cấu hình hệ thống (Admin Setup)
Chạy script để thực hiện các việc: Mở khóa giao dịch, nạp 200k VLT vào Treasury, Khóa 300k VLT cho Team, và phân bổ token cho các quỹ.

```powershell
npx hardhat run scripts/setupAdmin.ts --network sepolia
```

---

## BƯỚC 4: Cập nhật địa chỉ mới cho Frontend
1. Mở file: `blockchain/ignition/deployments/chain-11155111/deployed_addresses.json`
2. Bạn sẽ thấy danh sách 7 địa chỉ hợp đồng **MỚI TINH** trên mạng Sepolia.
3. Copy các địa chỉ này để thay thế cho các địa chỉ cũ (bên trong source code `frontend` hoặc file `.env` của frontend).
4. Quan trọng: Tìm file cấu hình mạng của Frontend (thường là chỗ setup Wagmi / Web3Modal) và **đổi mạng từ `hardhat` sang `sepolia`**.

---

## BƯỚC 5: Chạy Web Frontend
*Mở terminal mới, chuyển vào thư mục `frontend`*

```powershell
cd frontend
npm run dev
```

> 🎉 **HOÀN TẤT:** Bây giờ web của bạn đã chạy 100% trên mạng Sepolia. Bạn có thể deploy Frontend này lên **Vercel** và gửi link cho bạn bè test!
