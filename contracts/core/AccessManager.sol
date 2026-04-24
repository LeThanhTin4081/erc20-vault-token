// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import thư viện quản lý quyền (AccessControl) chuẩn từ OpenZeppelin
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessManager
 * @dev Hợp đồng quản lý phân quyền tập trung (RBAC - Role-Based Access Control).
 * Tất cả các hợp đồng khác trong hệ thống (Treasury, Locker, Staking...) 
 * sẽ gọi về hợp đồng này thông qua interface IAccessManager để kiểm tra quyền.
 * 
 * Việc tách riêng AccessManager giúp:
 * 1. Quản lý quyền tập trung tại một nơi (tránh mỗi hợp đồng tự quản lý một mớ role).
 * 2. Dễ dàng thu hồi hoặc cấp quyền mới nếu Admin bị lộ Private Key.
 */
contract AccessManager is AccessControl {

    // ========== ROLE CONSTANTS ==========
    // Các định danh vai trò được mã hóa băm (keccak256) để tối ưu không gian lưu trữ EVM

    // Quyền tối cao: Có thể cấp/thu hồi quyền của người khác, rút tiền Treasury.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Quyền in token: Dành riêng cho địa chỉ nào được đúc thêm (mint) VLT.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Quyền Vault: Dành riêng cho hợp đồng StakingVault (để gọi hàm nhạy cảm nếu cần).
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // ========== CONSTRUCTOR ==========

    /**
     * @dev Khởi tạo AccessManager.
     * Người deploy (msg.sender) sẽ được cấp luôn cả 2 quyền cao nhất:
     * 1. DEFAULT_ADMIN_ROLE (Quyền mặc định của OpenZeppelin, dùng để quản lý các Role khác).
     * 2. ADMIN_ROLE (Quyền quản trị riêng của dự án Vault Token).
     */
    constructor() {
        // Cấp quyền DEFAULT_ADMIN_ROLE cho người deploy
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Cấp quyền ADMIN_ROLE cho người deploy
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ========== FUNCTIONS ==========
    // Lưu ý: Các hàm grantRole, revokeRole, hasRole đã được viết sẵn và tối ưu 
    // trong AccessControl.sol của OpenZeppelin, chúng ta không cần viết lại.
    // 
    // Ví dụ cách gọi từ hợp đồng khác:
    // accessManager.hasRole(ADMIN_ROLE, msg.sender)
}
