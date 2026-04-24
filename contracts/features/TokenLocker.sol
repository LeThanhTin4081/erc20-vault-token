// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TokenLocker
 * @dev Hỗ trợ khóa token của team hoặc user theo kỳ hạn (Vesting đơn giản).
 * Không liên quan đến tích điểm hay phần thưởng.
 */
contract TokenLocker {

    struct LockInfo {
        uint256 amount;
        uint256 unlockTime;
        bool isReleased;
    }

    // Mapping từ user sang danh sách khóa token của họ
    mapping(address => LockInfo[]) public userLocks;

    constructor() {
        // Tham chiếu đến địa chỉ Token chính
    }

    /**
     * @dev Khóa token trong khoảng thời gian nhất định
     */
    function lock(uint256 amount, uint256 duration) external {
        // Cần user approve token trước đó
        // transferFrom user -> contract
    }

    /**
     * @dev Rút token đã khóa khi đáo hạn
     */
    function unlock(uint256 lockId) external {
        // Check unlockTime <= block.timestamp
        // Rút token trả về cho user
    }
}
