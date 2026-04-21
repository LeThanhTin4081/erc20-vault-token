// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AirdropDistributor
 * @dev Nơi người dùng thực hiện nhận tiền Airdrop.
 * Khớp điểm của AirdropPoints, và rút tiền từ quỹ allowance của Treasury.
 */
contract AirdropDistributor {
    
    // Đánh dấu người dùng đã nhận phần thưởng theo từng đợt
    mapping(uint256 => mapping(address => bool)) public claimed;

    constructor() {
        // Liên kết AirdropPoints và Treasury
    }

    /**
     * @dev User gọi để claim Airdrop
     */
    function claim(uint256 snapshotId) external {
        // 1. Kiểm tra claimed[snapshotId][msg.sender] == false
        // 2. Tính toán tiền theo điểm từ AirdropPoints (getPoints)
        // 3. Mark claimed = true
        // 4. transferFrom quỹ của Treasury -> User
    }

    /**
     * @dev Hàm xem trước số tiền User sẽ nhận được nếu claim
     */
    function calculateReward(address user, uint256 snapshotId) public view returns (uint256) {
        // Công thức quy đổi Point -> Token
        return 0;
    }
}
