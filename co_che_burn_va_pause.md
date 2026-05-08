# 🔥 CƠ CHẾ ĐỐT TỰ ĐỘNG (AUTO-BURN) & TẠM DỪNG (PAUSABLE)

Tài liệu này giải thích 2 tính năng bảo mật và kiểm soát kinh tế cực kỳ mạnh mẽ được tích hợp trực tiếp vào trái tim của dự án: Hợp đồng `LaunchToken.sol`.

---

## 1. CƠ CHẾ ĐỐT TỰ ĐỘNG (AUTO-BURN)

Đây là cơ chế giúp đồng VLT có tính chất **giảm phát (Deflationary)**. Nghĩa là càng nhiều người giao dịch, số lượng VLT trên thị trường càng ít đi, từ đó thúc đẩy giá trị token tăng lên.

### Cách thức hoạt động:
- **Cài đặt Tỷ lệ:** Admin có quyền gọi hàm `setBurnRate()` để cài đặt tỷ lệ đốt. 
- **Đơn vị tính:** Tỷ lệ được tính theo *phần vạn* (Basis points). 
  - `100` = 1%
  - `50` = 0.5%
  - `1000` = 10% (Đây là mức Tối Đa mà code cho phép để tránh lạm quyền).
  - `0` = Tắt tính năng đốt (Mặc định khi mới deploy là 0).

### Toán học đằng sau (Bên trong hàm `_update`):
Khi người dùng A chuyển `10,000 VLT` cho người dùng B, và hệ thống đang cài đặt Burn Rate là `50%` (tương đương con số 5000 do bạn thiết lập nãy giờ để test):
1. Hệ thống tính toán: `burnAmount = (10,000 * 5000) / 10000 = 5,000 VLT`.
2. Hệ thống ngầm gửi **5,000 VLT** này vào "Hố đen" (địa chỉ `0x000...000`), xóa bỏ nó vĩnh viễn khỏi Tổng cung (Total Supply).
3. Người dùng B (hoặc hợp đồng Staking) thực tế chỉ nhận được: `10,000 - 5,000 = 5,000 VLT`.

👉 *Đó là lý do tại sao lúc nãy bạn gửi 20,000 VLT vào Staking Vault mà nó chỉ nhận được 10,000 VLT. 10,000 VLT kia đã bốc hơi vĩnh viễn!*

---

## 2. CƠ CHẾ TẠM DỪNG KHẨN CẤP (PAUSABLE)

Đây là chiếc "Phanh khẩn cấp" (Emergency Brake) của hệ thống. Nó được dùng trong trường hợp dự án bị hacker tấn công, hoặc phát hiện có lỗi nghiêm trọng cần khắc phục.

### Cách thức hoạt động:
- **Kích hoạt:** Admin gọi hàm `pause()`.
- **Hậu quả:** Toàn bộ các giao dịch chuyển tiền (Transfer), mua bán, Stake, Unstake của **tất cả người dùng bình thường đều bị chặn đứng ngay lập tức**. Nếu họ cố tình giao dịch, màn hình sẽ báo lỗi *"LaunchToken: token transfer while paused"*.

### Đặc quyền của Admin (Admin Immunity):
Điều tuyệt vời trong code của bạn là: **Khi hệ thống Pause, Admin KHÔNG bị ảnh hưởng.**
Bên trong hàm `_update` có đoạn code kiểm tra:
Nếu hệ thống đang Pause `&&` người gửi không phải Admin ➔ Chặn.
Nghĩa là, trong lúc nước sôi lửa bỏng, Admin vẫn có thể:
1. Rút tiền từ các quỹ về ví an toàn.
2. Di chuyển token để khắc phục hậu quả.
3. Chỉnh sửa các hợp đồng khác.

- **Mở lại hệ thống:** Sau khi sóng yên biển lặng, Admin gọi hàm `unpause()`. Mọi hoạt động của người dùng sẽ lập tức trở lại bình thường như chưa hề có cuộc chia ly!
