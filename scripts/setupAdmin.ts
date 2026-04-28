import hre from "hardhat";

import fs from "fs";
import path from "path";

async function main() {
    // Lấy signers từ Hardhat theo quy ước:
    // #0 = Admin/Deployer, #1 = User test, #2 = PublicSaleWallet, #3 = SeedWallet, #4 = ReserveWallet
    // Đọc địa chỉ từ file JSON được tạo ra tự động bởi Hardhat Ignition
    const addressesPath = path.join(process.cwd(), "ignition/deployments/chain-31337/deployed_addresses.json");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("Không tìm thấy file deployed_addresses.json. Vui lòng chạy lệnh deploy Local trước!");
    }
    
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    // Lấy các địa chỉ quan trọng
    const launchTokenAddr = addresses["DeploySystemModule#LaunchToken"];
    const treasuryAddr = addresses["DeploySystemModule#Treasury"];
    const distributorAddr = addresses["DeploySystemModule#AirdropDistributor"];
    const lockerAddr = addresses["DeploySystemModule#TokenLocker"];
    
    console.log("Bắt đầu cấu hình Admin Setup (Bước 3)...\n");
    
    // Khởi tạo Ethers theo cấu hình đặc thù của dự án
    const connection = await hre.network.connect();
    const ethers = connection.ethers;

    const [admin, user1, publicSaleWallet, seedWallet, reserveWallet] = await ethers.getSigners();
    console.log("Admin wallet       :", admin.address);
    console.log("PublicSaleWallet   :", publicSaleWallet.address);
    console.log("SeedWallet         :", seedWallet.address);
    console.log("ReserveWallet      :", reserveWallet.address);
    console.log("");
    
    // Kết nối vào các Contract
    const launchToken = await ethers.getContractAt("LaunchToken", launchTokenAddr);
    const treasury = await ethers.getContractAt("Treasury", treasuryAddr);
    const tokenLocker = await ethers.getContractAt("TokenLocker", lockerAddr);
    
    // 1. Mở giao dịch (Open Trading)
    console.log("1. Đang mở tính năng giao dịch (Launch Gating)...");
    const isTradingOpen = await launchToken.tradingOpen();
    let tx;
    if (!isTradingOpen) {
        tx = await launchToken.openTrading();
        await tx.wait();
        console.log("✅ Đã mở giao dịch thành công!");
    } else {
        console.log("✅ Giao dịch đã được mở từ trước rồi!");
    }

    // 2. Nạp 20% Community/Airdrop vào quỹ Treasury theo tokenomics
    console.log("\n2. Đang nạp 200,000 VLT vào Ngân khố (Treasury)...");
    const depositAmount = ethers.parseEther("200000");
    
    // Phải approve cho Treasury trước khi nạp
    tx = await launchToken.approve(treasuryAddr, depositAmount);
    await tx.wait();
    
    // Tiến hành nạp (deposit)
    tx = await treasury.deposit(depositAmount);
    await tx.wait();
    console.log("✅ Đã nạp 200,000 VLT vào quỹ thành công!");

    // 3. Cấp định mức (allowance) cho Distributor
    console.log("\n3. Cấp quyền cho AirdropDistributor rút tiền từ quỹ...");
    tx = await treasury.approveSpender(distributorAddr, depositAmount);
    await tx.wait();
    console.log("✅ Đã cấp quyền Distributor thành công!");

    // 4. Khóa 30% Team/Dev theo tokenomics
    console.log("\n4. Khóa 300,000 VLT Team/Dev (thời hạn 180 ngày)...");
    const lockAmount = ethers.parseEther("300000");
    const lockDuration = 180 * 24 * 60 * 60; // 180 ngày
    
    // Phải approve cho Locker trước
    tx = await launchToken.approve(lockerAddr, lockAmount);
    await tx.wait();
    
    // Thực hiện Lock
    tx = await tokenLocker.lock(lockAmount, lockDuration);
    await tx.wait();
    console.log("✅ Đã khóa token thành công!");

    // 5. Phân bổ Public Sale / Seed / Reserve theo tokenomics (Cách 2: tách ví, không tạo contract mới)
    console.log("\n5. Phân bổ token theo tokenomics cho các ví Public Sale / Seed / Reserve...");

    tx = await launchToken.transfer(publicSaleWallet.address, ethers.parseEther("200000"));
    await tx.wait();
    console.log("  ✅ Đã chuyển 200,000 VLT -> PublicSaleWallet (Account #2):", publicSaleWallet.address);

    tx = await launchToken.transfer(seedWallet.address, ethers.parseEther("200000"));
    await tx.wait();
    console.log("  ✅ Đã chuyển 200,000 VLT -> SeedWallet (Account #3)    :", seedWallet.address);

    tx = await launchToken.transfer(reserveWallet.address, ethers.parseEther("100000"));
    await tx.wait();
    console.log("  ✅ Đã chuyển 100,000 VLT -> ReserveWallet (Account #4) :", reserveWallet.address);

    console.log("\n📊 Phân bổ Tokenomics sau setup:");
    console.log("  Treasury contract    : 200,000 VLT (Airdrop/Community)");
    console.log("  TokenLocker contract : 300,000 VLT (Team/Dev - khóa 180 ngày)");
    console.log("  PublicSaleWallet     : 200,000 VLT (Account #2)");
    console.log("  SeedWallet           : 200,000 VLT (Account #3)");
    console.log("  ReserveWallet        : 100,000 VLT (Account #4)");
    console.log("  Tổng:                  1,000,000 VLT ✅");

    console.log("\n🎉 HOÀN TẤT SETUP ADMIN! HỆ THỐNG ĐÃ SẴN SÀNG 100% CHO USER VÀ FRONTEND!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
