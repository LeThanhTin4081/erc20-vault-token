// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockAccessManager
 * @dev Bản giả lập AccessManager, CHỈ DÙNG ĐỂ TEST.
 * Khi leader code xong AccessManager thật thì file này không cần nữa.
 */
contract MockAccessManager {

    // Lưu role của từng account
    // roles[role][account] = true/false
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // Các role constant (giống hệt AccessManager thật)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    constructor() {
        // Người deploy tự động có ADMIN_ROLE
        _roles[ADMIN_ROLE][msg.sender] = true;
    }

    // Check quyền — hàm mà TokenLocker và Treasury sẽ gọi
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    // Cấp role (chỉ dùng trong test để setup)
    function grantRole(bytes32 role, address account) external {
        _roles[role][account] = true;
    }

    // Thu hồi role
    function revokeRole(bytes32 role, address account) external {
        _roles[role][account] = false;
    }
}
