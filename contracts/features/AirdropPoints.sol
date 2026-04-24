// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AirdropPoints
 * @dev Kế toán điểm (Point Accounting) để chuẩn bị cho Airdrop lúc Snapshot.
 * Contract này không hề giữ token, chỉ giữ số mapping.
 */
contract AirdropPoints {
    
    // mapping(userId => mapping(snapshotId => points))
    
    uint256 public currentSnapshotId;

    constructor() {
        // Liên kết AccessManager
    }

    /**
     * @dev Thêm điểm cho user (Chỉ cho phép gọi bới hợp đồng có VAULT_ROLE)
     */
    function addPoints(address user, uint256 points) external {
        // Skeleton code
    }

    /**
     * @dev Lưu mốc snapshot hiện tại (Chỉ ADMIN)
     */
    function snapshot() external returns (uint256) {
        // Tăng currentSnapshotId
        // Trả về Id mới nhất
        return currentSnapshotId;
    }

    /**
     * @dev View: Đọc số điểm của user tại mốc ID
     */
    function getPoints(address user, uint256 snapshotId) external view returns (uint256) {
        // Skeleton code
        return 0;
    }
}
