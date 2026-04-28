// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AirdropPoints
 * @dev Hợp đồng ghi nhận điểm (Point Accounting) cho Airdrop lúc Snapshot.
 * Sử dụng AccessManager chung để kiểm tra quyền (đúng kiến trúc hệ thống).
 */

// Interface nhỏ để gọi hàm của AccessManager (check quyền)
interface IAccessManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

contract AirdropPoints {

    // STATE VARIABLES

    /**
     * @dev Mã băm (Hash) định danh cho quyền VAULT_ROLE.
     * Chỉ những tài khoản/hợp đồng được cấp quyền này (như StakingVault) mới được gọi hàm addPoints().
     */
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    /**
     * @dev Mã băm (Hash) định danh cho quyền ADMIN_ROLE.
     * Chỉ admin mới được gọi hàm snapshot().
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /**
     * @dev Địa chỉ AccessManager (hệ thống phân quyền tập trung).
     */
    IAccessManager public accessManager;

    /**
     * @dev ID của đợt Snapshot hiện hành.
     * Mỗi khi chốt sổ, ID này sẽ tăng lên 1 để chuẩn bị cho đợt tiếp theo.
     */
    uint256 public currentSnapshotId;

    /**
     * @dev Bản đồ 2 lớp lưu trữ điểm của người dùng theo từng đợt (epoch).
     * mapping(User Address => mapping(Snapshot ID => Số điểm))
     */
    mapping(address => mapping(uint256 => uint256)) private _points;

    // EVENTS

    /**
     * @dev Sự kiện được phát ra (emit) mỗi khi có điểm được cộng thành công.
     */
    event PointsAdded(
        address indexed user,
        uint256 indexed snapshotId,
        uint256 amount
    );

    /**
     * @dev Sự kiện phát ra khi Admin tạo một mốc thời gian (snapshot) mới.
     */
    event SnapshotCreated(uint256 snapshotId);

    // MODIFIERS

    modifier onlyVault() {
        require(
            accessManager.hasRole(VAULT_ROLE, msg.sender),
            "AirdropPoints: caller is not vault"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            accessManager.hasRole(ADMIN_ROLE, msg.sender),
            "AirdropPoints: caller is not admin"
        );
        _;
    }

    // CONSTRUCTOR

    /**
     * @dev Hàm khởi tạo. Nhận địa chỉ AccessManager để kiểm tra quyền.
     * @param _accessManager Địa chỉ của hợp đồng AccessManager
     */
    constructor(address _accessManager) {
        accessManager = IAccessManager(_accessManager);
    }

    // CORE FUNCTIONS

    /**
     * @dev Thêm điểm cho người dùng (chỉ hợp đồng StakingVault mới được phép gọi).
     * @param user Địa chỉ ví của người dùng.
     * @param amount Số điểm được cộng thêm.
     */
    function addPoints(
        address user,
        uint256 amount
    ) external onlyVault {
        require(amount > 0, "Amount must be > 0");
        _points[user][currentSnapshotId] += amount;
        emit PointsAdded(user, currentSnapshotId, amount);
    }

    /**
     * @dev Lưu mốc snapshot hiện hành và chuyển sang đợt mới.
     * Chỉ người có ADMIN_ROLE mới được thực hiện.
     * @return Trả về ID của mốc snapshot mới được tạo.
     */
    function snapshot()
        external
        onlyAdmin
        returns (uint256)
    {
        currentSnapshotId++;
        emit SnapshotCreated(currentSnapshotId);
        return currentSnapshotId;
    }

    // VIEW FUNCTIONS

    /**
     * @dev Tra cứu điểm của một người dùng tại một đợt (snapshotId) cụ thể.
     */
    function getPoints(
        address user,
        uint256 snapshotId
    ) external view returns (uint256) {
        return _points[user][snapshotId];
    }

    /**
     * @dev Tra cứu điểm của người dùng ở đợt hiện tại (chưa chốt sổ).
     */
    function getCurrentPoints(address user) external view returns (uint256) {
        return _points[user][currentSnapshotId];
    }
}
