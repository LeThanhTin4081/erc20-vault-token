// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import ERC-20 đầy đủ từ OpenZeppelin (không phải interface, mà là implementation thật)
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockLaunchToken
 * @dev Bản giả lập LaunchToken, CHỈ DÙNG ĐỂ TEST.
 * Là token ERC-20 thật (có transfer, approve, balanceOf...) + thêm tradingOpen.
 */
contract MockLaunchToken is ERC20 {

    // Cờ đánh dấu hệ thống đã mở trading chưa
    bool public tradingOpen;

    // Constructor: tạo token tên "VaultToken", symbol "VLT"
    // Mint luôn 1,000,000 VLT cho người deploy (để test)
    constructor() ERC20("VaultToken", "VLT") {
        tradingOpen = false; // Ban đầu chưa mở
        _mint(msg.sender, 1_000_000 * 10**decimals()); // 1M token
    }

    // Admin gọi để mở trading
    function openTrading() external {
        tradingOpen = true;
    }

    // Hàm mint thêm token (dùng trong test)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
