# Các lệnh Terminal để chạy Local Test hàng ngày

Mỗi khi mở máy tính và bắt đầu test lại từ đầu, bạn cần bật 3 terminal và chạy các lệnh sau theo đúng thứ tự:

## Terminal 1: Chạy Blockchain Local (Hardhat Node)
*Mở terminal, đảm bảo đang ở thư mục gốc `blockchain` (`C:\Users\ADMIN\Documents\CODE\blockchain`)*
```powershell
npm run node
```
*(Cứ để terminal này chạy liên tục, nó đóng vai trò là mạng blockchain giả lập)*

## Terminal 2: Deploy & Setup Tokenomics
*Mở một terminal mới (dấu + trong VSCode), cũng ở thư mục `blockchain`*
```powershell
# B1: Deploy lại toàn bộ 7 smart contract lên mạng local
npm run deploy:local:reset

# B2: Chạy script phân bổ token (Mở trading, khóa 300k, chia cho các quỹ...)
npm run setup:local
```
*(Chạy xong 2 lệnh này thì có thể đóng terminal 2 hoặc dùng để chạy các lệnh khác sau này)*

## Terminal 3: Chạy Web Frontend
*Mở terminal mới, chuyển vào thư mục `frontend`*
```powershell
cd frontend
npm run dev
```
*(Để terminal này chạy liên tục để xem web)*

---

## 🔗 Link truy cập
Mở trình duyệt và vào: [http://localhost:3000](http://localhost:3000)

> 💡 **Lưu ý quan trọng để không bị lỗi:**
> Nếu bạn test sai, hoặc ví hết tiền, hoặc bị lỗi như "ERC20InsufficientBalance", cách sửa nhanh nhất là "Reset the world":
> 1. Qua Terminal 1 bấm `Ctrl + C` để tắt Node cũ.
> 2. Chạy lại `npm run node`.
> 3. Qua Terminal 2 chạy lại `npm run deploy:local:reset` và `npm run setup:local`.
> 4. Refresh trình duyệt (F5) là mọi thứ sẽ về trạng thái mới tinh (Account 2 có lại 200k, Locker trống...).
