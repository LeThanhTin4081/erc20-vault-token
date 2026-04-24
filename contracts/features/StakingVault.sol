// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StakingVault
 * @dev Cho phép người dùng Stake Token vào để lấy thưởng.
 * Update số điểm sang AirdropPoints.
 */
contract StakingVault {
    
    // Cần có ACC_REWARD_PRECISION để chia phần thưởng chuẩn xác
    uint256 public constant ACC_REWARD_PRECISION = 1e12;

    // TODO: Sử dụng ReentrancyGuard của OpenZeppelin

    constructor() {
        // Liên kết LaunchToken và AirdropPoints
    }

    /**
     * @dev Nạp token vào vault
     */
    function stake(uint256 amount) external {
        // Update reward logic
        // Chuyển token vào vault
        // Gọi addPoints() sang hợp đồng AirdropPoints
    }

    /**
     * @dev Rút token khỏi vault
     */
    function unstake(uint256 amount) external {
        // Update reward logic
        // Rút token trả về user
    }

    /**
     * @dev Claim reward do staking token (nếu có cơ chế lãi riêng)
     */
    function claimRewards() external {
        // Chuyển trả phần thưởng
    }

    /**
     * @dev Cho phép rút tiền bất chấp phần thưởng, dùng khi khẩn cấp
     */
    function emergencyWithdraw() external {
        // Xóa reward chờ
        // Trả vốn gốc cho hàm
    }
}
