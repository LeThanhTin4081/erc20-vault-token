// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AirdropPoints
 * @dev Hợp đồng ghi nhận điểm (Point Accounting) cho Airdrop lúc Snapshot.
 * Hợp đồng này sử dụng AccessControl của OpenZeppelin để phân quyền.
 */
contract AirdropPoints is AccessControl {
    /**
     * @dev Mã băm (Hash) định danh cho quyền VAULT_ROLE.
     * Chỉ những tài khoản/hợp đồng được cấp quyền này (như StakingVault) mới được gọi hàm addPoints().
     */
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

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

    /**
     * @dev Hàm khởi tạo. Chạy 1 lần duy nhất khi triển khai (deploy) hợp đồng.
     */
    constructor() {
        // Gán quyền quản trị cao nhất (DEFAULT_ADMIN_ROLE) cho người triển khai (deployer).
        // Người có quyền ADMIN sẽ được phép cấp (grant) các quyền khác như VAULT_ROLE.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Sự kiện được phát ra (emit) mỗi khi có điểm được cộng thành công.
     * @param user Địa chỉ người được cộng điểm.
     * @param snapshotId Mã đợt nhận điểm.
     * @param amount Số điểm được cộng.
     */
    event PointsAdded(
        address indexed user,
        uint256 indexed snapshotId,
        uint256 amount
    );

    /**
     * @dev Thêm điểm cho người dùng (chỉ hợp đồng StakingVault mới được phép gọi).
     * @param user Địa chỉ ví của người dùng.
     * @param amount Số điểm được cộng thêm.
     */
    function addPoints(
        address user,
        uint256 amount
    ) external onlyRole(VAULT_ROLE) {
        // [Edge case xử lý]: Chặn trường hợp cộng 0 điểm để tiết kiệm phí gas vô ích.
        require(amount > 0, "Amount must be > 0");

        // [Xử lý logic chính]: Cộng số điểm (amount) vào dữ liệu của người dùng tại đợt (snapshotId) hiện tại.
        // Dữ liệu được lưu trong cấu trúc mapping 2 lớp.
        // Lưu ý: Solidity 0.8+ đã tự động bảo vệ lỗi tràn số (overflow) nên phép toán += cực kỳ an toàn.
        _points[user][currentSnapshotId] += amount;

        // [Phát sự kiện]: Ghi log lên Blockchain để các ứng dụng (dapp) bên ngoài có thể lắng nghe và hiển thị.
        emit PointsAdded(user, currentSnapshotId, amount);
    }

    /**
     * @dev Sự kiện phát ra khi Admin tạo một mốc thời gian (snapshot) mới.
     * @param snapshotId ID của mốc snapshot vừa được tạo.
     */
    event SnapshotCreated(uint256 snapshotId);

    /**
     * @dev Lưu mốc snapshot hiện hành và chuyển sang đợt mới.
     * Chỉ người quản trị (DEFAULT_ADMIN_ROLE) mới được thực hiện hành động này.
     * @return Trả về ID của mốc snapshot mới được tạo.
     */
    function snapshot()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (uint256)
    {
        // [Xử lý logic]: Tăng ID của đợt hiện tại lên 1 đơn vị.
        // Ngay lập tức, tất cả các giao dịch addPoints() tiếp theo sẽ được lưu vào ID mới này,
        // đóng băng toàn bộ dữ liệu của ID cũ vĩnh viễn.
        currentSnapshotId++;

        // [Phát sự kiện]: Báo cho các Dapp biết một đợt snapshot mới đã bắt đầu.
        emit SnapshotCreated(currentSnapshotId);

        return currentSnapshotId;
    }

    /**
     * @dev Tra cứu điểm của một người dùng tại một đợt (snapshotId) cụ thể trong quá khứ.
     * Hàm này chỉ ĐỌC (view), không thay đổi state nên hoàn toàn MIỄN PHÍ gas khi gọi từ ngoài.
     *
     * @param user Địa chỉ ví người dùng.
     * @param snapshotId Mã đợt (ID) muốn tra cứu.
     * @return Số điểm mà người dùng đạt được tại đúng thời điểm đó.
     */
    function getPoints(
        address user,
        uint256 snapshotId
    ) external view returns (uint256) {
        // [Gas Efficient]: Chỉ cần 1 thao tác đọc (SLOAD) duy nhất từ storage mapping.
        return _points[user][snapshotId];
    }

    /**
     * @dev Tra cứu điểm của người dùng ở ngay thời điểm (đợt) hiện tại chưa chốt sổ.
     * Hàm này rất tiện ích để hiển thị lên giao diện Web (Frontend) cho người dùng xem điểm realtime.
     * Hàm này chỉ ĐỌC (view) nên hoàn toàn MIỄN PHÍ gas khi gọi từ ngoài.
     *
     * @param user Địa chỉ ví người dùng.
     * @return Số điểm người dùng đang tích lũy trong đợt (currentSnapshotId) hiện hành.
     */
    function getCurrentPoints(address user) external view returns (uint256) {
        // [Gas Efficient]: Đọc giá trị currentSnapshotId và truy vấn mapping trực tiếp.
        return _points[user][currentSnapshotId];
    }
}
