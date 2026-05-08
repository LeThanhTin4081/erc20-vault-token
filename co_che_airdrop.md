# 🚀 CƠ CHẾ THƯỞNG ĐIỂM & NHẬN AIRDROP (Vault Token - VLT)

Tài liệu này giải thích chi tiết vòng lặp kinh tế của hệ thống Airdrop dự án Vault Token (VLT), được lập trình chặt chẽ thông qua 3 Smart Contracts: `StakingVault`, `AirdropPoints`, và `AirdropDistributor`.

---

## 🛠 BƯỚC 1: STAKE VLT ĐỂ "ĐÀO" ĐIỂM (StakingVault.sol)

Để nhận được Airdrop, người dùng bắt buộc phải khóa đồng VLT của họ vào Bể Staking. Hệ thống sẽ tự động thưởng **Điểm (Airdrop Points)** cho họ theo thời gian thực.

- **Tốc độ đào:** Hệ thống (Pool) tạo ra đúng **1 Điểm / 1 giây**.
- **Cách chia điểm:** 1 Điểm này được chia đều cho tất cả mọi người dựa trên **Tỷ lệ %** mà họ đóng góp vào tổng bể (Total Staked).
- **Ví dụ:** 
  - Bể đang có tổng cộng 20,000 VLT.
  - Bạn bỏ vào 10,000 VLT (chiếm 50% tổng bể).
  - Tốc độ nhận điểm của bạn = `1 * 50% = 0.5 Điểm/giây`. 
  - Một ngày (86,400 giây) bạn sẽ nhận được **43,200 Điểm**.
- **Thu hoạch:** Người dùng bấm nút **"Claim Points"** trên giao diện, số điểm này sẽ được chuyển và lưu trữ an toàn tại hợp đồng `AirdropPoints`.

---

## 📸 BƯỚC 2: CHỐT SỔ KỲ TRẢ LƯƠNG (AirdropPoints.sol)

Hệ thống không cho phép đổi điểm lấy tiền liên tục, mà hoạt động theo từng đợt (Epoch/Kỳ).

- Trưởng dự án (Admin) là người duy nhất có quyền bấm nút **Snapshot** (Chụp ảnh).
- Ngay tại giây phút bấm nút, hệ thống sẽ "đóng băng" dữ liệu và ghi lại sổ sách: *"Tại Kỳ số X, Ví A đang có 1,000 điểm, Ví B có 5,000 điểm..."*.
- Kể từ giây tiếp theo, người dùng vẫn đào điểm bình thường nhưng điểm đó sẽ được cộng dồn để tính cho **Kỳ số X+1**.

---

## 💰 BƯỚC 3: ĐỔI ĐIỂM LẤY VLT THẬT (AirdropDistributor.sol)

Đây là bước người dùng nhận thành quả sau những ngày tháng Staking.

- **Tỷ giá quy đổi:** Hiện tại code đang set cứng tỷ giá là `rewardPerPoint = 1` (Tức là **1 Điểm = 1 VLT**).
- **Cách nhận:** 
  - Người dùng vào mục Airdrop trên web, chọn đúng Kỳ (Snapshot ID) đã được chốt sổ và bấm **"Claim Reward"**.
  - Hệ thống kiểm tra: Nếu bạn có 1,000 điểm trong kỳ đó, bạn được nhận 1,000 VLT.
- **Dòng tiền di chuyển:** 
  - Hệ thống sẽ tự động "mở két sắt" (Hợp đồng **Treasury**) và rút đúng 1,000 VLT chuyển thẳng vào ví MetaMask của người dùng.
  - Mỗi kỳ, người dùng chỉ được nhận thưởng đúng **1 lần** duy nhất.

---

## 💎 Ý NGHĨA KINH TẾ (TOKENOMICS)

Cơ chế này tạo ra một vòng lặp cực kỳ có lợi cho giá trị của đồng VLT:
1. Người dùng muốn có **Tiền Airdrop miễn phí**.
2. Bắt buộc phải gom **VLT** để đem đi **Staking**.
3. Khi lượng lớn VLT bị "nhốt" vào Staking Vault ➔ **Nguồn cung lưu thông ngoài thị trường giảm mạnh**.
4. Nhu cầu mua VLT để Staking cao + Nguồn cung ít ➔ **Giá VLT trên sàn sẽ tăng trưởng bền vững**.
