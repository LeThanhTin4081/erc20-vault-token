// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessManager
 * @dev Quản lý RBAC phân quyền toàn hệ thống.
 * Chứa danh sách các Role và API để kiểm tra quyền hạn.
 */
contract AccessManager {
    
    // Định nghĩa tĩnh các Role
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // TODO: Kế thừa OpenZeppelin AccessControl

    constructor() {
        // Cấp quyền ADMIN_ROLE cho người deploy (msg.sender)
    }

    /**
     * @dev Cấp role cho account (chỉ ADMIN)
     */
    function grantRole(bytes32 role, address account) external {
        // Skeleton code
    }

    /**
     * @dev Thu hồi role (chỉ ADMIN)
     */
    function revokeRole(bytes32 role, address account) external {
        // Skeleton code
    }

    /**
     * @dev Hàm trả về true nếu account có quyền
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        // Skeleton code
        return false;
    }
}
