import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Script Triển khai toàn bộ Hệ thống Vault Token (Sử dụng Hardhat Ignition).
 * Ignition tự động xử lý các dependencies (sự phụ thuộc) giữa các contract
 * đúng y như sơ đồ luồng mà bạn đã phân tích.
 */
export default buildModule("DeploySystemModule", (m) => {
  // ========================================================================
  // BƯỚC 1: TRIỂN KHAI NỀN TẢNG PHÂN QUYỀN (Deploy đầu tiên)
  // ========================================================================
  const accessManager = m.contract("AccessManager", []);

  // ========================================================================
  // BƯỚC 2: TRIỂN KHAI TOKEN LÕI (Cần địa chỉ AccessManager)
  // ========================================================================
  const launchToken = m.contract("LaunchToken", [accessManager]);

  // ========================================================================
  // BƯỚC 3 -> 6: TRIỂN KHAI CÁC MODULE SONG SONG
  // Các hợp đồng này không phụ thuộc nhau, chỉ cần LaunchToken & AccessManager
  // ========================================================================
  
  const tokenLocker = m.contract("TokenLocker", [launchToken, accessManager]);
  const treasury = m.contract("Treasury", [launchToken, accessManager]);

  /* 
   * [COMMENT LẠI CHỜ 3 BẠN KIA CODE XONG]
   *
   * const stakingVault = m.contract("StakingVault", [launchToken, accessManager]);
   * const airdropPoints = m.contract("AirdropPoints", [launchToken, accessManager]);
   *
   * // BƯỚC 7: TRIỂN KHAI AIRDROP DISTRIBUTOR (Phụ thuộc Treasury và AirdropPoints)
   * const airdropDistributor = m.contract("AirdropDistributor", [
   *   launchToken, 
   *   accessManager, 
   *   treasury, 
   *   airdropPoints
   * ]);
   *
   * // BƯỚC 8: CẤP QUYỀN (Post-deployment setup)
   * // Cấp VAULT_ROLE cho StakingVault để nó có quyền gọi hàm addPoints
   * const VAULT_ROLE = m.getParameter("vaultRole", "0x..."); // Tính keccak256("VAULT_ROLE")
   * m.call(accessManager, "grantRole", [VAULT_ROLE, stakingVault]);
   */

  // Trả về danh sách các contract đã deploy để Hardhat Ignition theo dõi
  return { 
    accessManager, 
    launchToken, 
    tokenLocker, 
    treasury 
  };
});
