// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
 * - Pausable: Cho phép Admin tạm dừng toàn bộ giao dịch khi khẩn cấp.
 * - BurnRate: Tự động đốt một phần token mỗi khi transfer (nếu bật).
 */
contract LaunchToken is ERC20Capped, ERC20Burnable, Pausable {

    // STATE VARIABLES

    IAccessManager public accessManager;
    
    // Lưu các role hash để kiểm tra
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Trạng thái ra mắt hệ thống
    bool public tradingOpen;
    uint256 public launchTime;

    // Tỷ lệ đốt tự động (đơn vị: phần vạn)
    // Ví dụ: 100 = 1%, 50 = 0.5%, 0 = tắt (mặc định)
    uint256 public burnRate;

    // EVENTS

    event TradingOpened(uint256 timestamp);
    event BurnRateUpdated(uint256 newRate);

    // MODIFIERS

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

    // CONSTRUCTOR

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
        burnRate = 0; // Mặc định tắt auto burn

        // Đúc (Mint) 1.000.000 VLT ban đầu (Initial Supply) cho người deploy
        ERC20._mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // ADMIN FUNCTIONS

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

    /**
     * @dev Thiết lập tỷ lệ đốt tự động khi transfer (Chỉ Admin).
     * @param _burnRate Tỷ lệ đốt (phần vạn). VD: 100 = 1%, tối đa 1000 = 10%
     */
    function setBurnRate(uint256 _burnRate) external onlyAdmin {
        require(_burnRate <= 1000, "LaunchToken: burn rate max 10%");
        burnRate = _burnRate;
        emit BurnRateUpdated(_burnRate);
    }

    /**
     * @dev Tạm dừng toàn bộ giao dịch token (Chỉ Admin).
     * Dùng khi phát hiện lỗ hổng bảo mật hoặc sự cố khẩn cấp.
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Mở lại giao dịch sau khi đã tạm dừng (Chỉ Admin).
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    // OVERRIDES

    /**
     * @dev Ghi đè hàm _update nội bộ của ERC20.
     * Hàm này được gọi tự động mỗi khi có transfer, mint, burn.
     * Bao gồm các cơ chế bảo vệ:
     * 1. Pausable: Chặn mọi giao dịch khi hệ thống tạm dừng (trừ Admin).
     * 2. Launch Gating: Chặn user giao dịch trước khi openTrading (trừ Admin).
     * 3. Auto Burn: Tự động đốt một phần token khi transfer (nếu burnRate > 0).
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Capped) {
        // PAUSABLE CHECK
        // Khi hệ thống bị pause, chỉ Admin mới được phép thao tác (hoặc mint từ address(0))
        if (paused() && from != address(0)) {
            require(
                accessManager.hasRole(ADMIN_ROLE, from) || accessManager.hasRole(ADMIN_ROLE, msg.sender),
                "LaunchToken: token transfer while paused"
            );
        }

        // LAUNCH GATING
        // Nếu hệ thống chưa mở, chỉ có Admin mới được quyền luân chuyển token
        if (!tradingOpen && from != address(0)) {
            require(
                accessManager.hasRole(ADMIN_ROLE, from) || accessManager.hasRole(ADMIN_ROLE, msg.sender),
                "LaunchToken: trading is not open yet"
            );
        }

        // AUTO BURN
        // Chỉ áp dụng khi: burnRate > 0, không phải mint (from != 0), không phải burn (to != 0)
        if (burnRate > 0 && from != address(0) && to != address(0)) {
            uint256 burnAmount = (value * burnRate) / 10000;
            if (burnAmount > 0) {
                // Đốt phần token bị trừ
                super._update(from, address(0), burnAmount);
                // Giảm số token thực nhận
                value -= burnAmount;
            }
        }

        // Gọi hàm _update gốc để thực thi giao dịch
        super._update(from, to, value);
    }
}
