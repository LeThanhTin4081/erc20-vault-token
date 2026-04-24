// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LaunchToken
 * @dev Token chính của hệ thống, chuẩn ERC20. 
 * Đặc điểm: hỗ trợ mint (chỉ Minter), burn, và kiểm soát mở trading.
 */
contract LaunchToken {
    
    bool public tradingOpen;

    // TODO: Kế thừa OpenZeppelin (ERC20, ERC20Burnable)
    // TODO: Tích hợp AccessManager để check role

    constructor() {
        // Khởi tạo token
    }

    /**
     * @dev Tạo token mới, cần MINTER_ROLE
     */
    function mint(address to, uint256 amount) external {
        // Skeleton code
    }

    /**
     * @dev Đốt token của người gửi
     */
    function burn(uint256 amount) external {
        // Skeleton code
    }

    /**
     * @dev Mở giao dịch tự do (chỉ Admin)
     */
    function openTrading() external {
        // Skeleton code
    }
}
