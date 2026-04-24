// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// Interface để gọi sang AccessManager kiểm tra quyền
interface IAccessManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/**
 * @title LaunchToken
 * @dev Hợp đồng cốt lõi của đồng Vault Token (VLT).
 * Kết hợp chuẩn ERC20 cơ bản với các tính năng:
 * - Capped: Tổng cung tối đa là 10,000,000 VLT (ngăn lạm phát vô hạn).
 * - Burnable: Cho phép đốt token để giảm nguồn cung.
 * - Mintable: Cho phép đúc thêm token (giới hạn bởi Capped) bởi MINTER_ROLE.
 * - Launch Gating: Chức năng khóa giao dịch trước ngày ra mắt (trừ Admin).
 */
contract LaunchToken is ERC20Capped, ERC20Burnable {

    // ========== STATE VARIABLES ==========

    IAccessManager public accessManager;
    
    // Lưu các role hash để kiểm tra
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Trạng thái ra mắt hệ thống
    bool public tradingOpen;
    uint256 public launchTime;

    // ========== EVENTS ==========

    event TradingOpened(uint256 timestamp);

    // ========== MODIFIERS ==========

    modifier onlyAdmin() {
        require(
            accessManager.hasRole(ADMIN_ROLE, msg.sender),
            "LaunchToken: caller is not admin"
        );
        _;
    }

    modifier onlyMinter() {
        require(
            accessManager.hasRole(MINTER_ROLE, msg.sender),
            "LaunchToken: caller is not minter"
        );
        _;
    }

    // ========== CONSTRUCTOR ==========

    /**
     * @dev Khởi tạo Token và đúc sẵn lượng Initial Supply.
     * @param _accessManager Địa chỉ của hợp đồng AccessManager
     */
    constructor(address _accessManager) 
        ERC20("Vault Token", "VLT") 
        ERC20Capped(10_000_000 * 10 ** decimals()) // Hard cap: 10 Triệu VLT
    {
        accessManager = IAccessManager(_accessManager);
        tradingOpen = false;

        // Đúc (Mint) 1.000.000 VLT ban đầu (Initial Supply) cho người deploy
        ERC20._mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev Mở hệ thống cho phép người dùng giao dịch (Chỉ Admin).
     * Chỉ được gọi 1 lần duy nhất.
     */
    function openTrading() external onlyAdmin {
        require(!tradingOpen, "LaunchToken: trading is already open");
        tradingOpen = true;
        launchTime = block.timestamp;
        emit TradingOpened(block.timestamp);
    }

    /**
     * @dev Đúc thêm token mới (Chỉ Minter).
     * @param to Địa chỉ nhận token
     * @param amount Số lượng đúc
     * Lưu ý: Không thể đúc vượt quá 10,000,000 VLT (do ERC20Capped tự động chặn).
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    // ========== OVERRIDES ==========

    /**
     * @dev Ghi đè hàm _update nội bộ của ERC20.
     * Hàm này được gọi tự động mỗi khi có transfer, mint, burn.
     * Mục đích: Chặn người dùng giao dịch trước khi `openTrading` được gọi.
     * Ngoại lệ: Admin vẫn được quyền chuyển token để setup hệ thống (nạp két, khóa quỹ).
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Capped) {
        // Kiểm tra logic Launch Gating
        // Nếu hệ thống chưa mở, chỉ có Admin mới được quyền luân chuyển token (hoặc là thao tác mint từ địa chỉ 0)
        if (!tradingOpen && from != address(0)) {
            require(
                accessManager.hasRole(ADMIN_ROLE, from) || accessManager.hasRole(ADMIN_ROLE, msg.sender),
                "LaunchToken: trading is not open yet"
            );
        }

        // Gọi hàm _update gốc để thực thi giao dịch
        super._update(from, to, value);
    }
}
