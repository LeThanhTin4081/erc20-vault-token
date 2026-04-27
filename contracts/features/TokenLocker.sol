// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import interface ERC-20 chuẩn từ OpenZeppelin
// Để gọi được transferFrom(), transfer(), balanceOf()...
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TokenLocker
 * @dev Hỗ trợ khóa token của team hoặc user theo kỳ hạn (Vesting đơn giản).
 * Không liên quan đến tích điểm hay phần thưởng.
 */

// Interface nhỏ để gọi hàm của AccessManager (check quyền)
interface IAccessManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

// Interface nhỏ để đọc trạng thái launch từ LaunchToken
interface ILaunchToken {
    function tradingOpen() external view returns (bool);
}

contract TokenLocker {

    // STATE VARIABLES

    // Địa chỉ token ERC-20 (LaunchToken)
    IERC20 public token;

    // Địa chỉ AccessManager (để check quyền)
    IAccessManager public accessManager;

    // Struct lưu thông tin 1 lần khóa token
    struct LockInfo {
        uint256 amount;      // Số token bị khóa
        uint256 unlockTime;  // Thời điểm được mở khóa (Unix timestamp)
        bool isReleased;     // Đã rút chưa? true = đã rút rồi
    }

    // Mapping: mỗi user có 1 mảng các lần khóa
    // Ví dụ: userLocks[0xABC] = [LockInfo1, LockInfo2, ...]
    mapping(address => LockInfo[]) public userLocks;

    // EVENTS
    // Event phát ra khi user khóa token thành công
    // indexed = cho phép lọc/tìm kiếm theo trường đó trên blockchain
    event Locked(
        address indexed user,       // Ai khóa
        uint256 indexed lockId,     // Lock thứ mấy của user đó
        uint256 amount,             // Khóa bao nhiêu token
        uint256 unlockTime          // Khi nào được mở
    );

    // Event phát ra khi user mở khóa token thành công
    event Unlocked(
        address indexed user,       // Ai mở khóa
        uint256 indexed lockId,     // Lock thứ mấy
        uint256 amount              // Số token đã nhận lại
    );

    // MODIFIER
    // Chặn hành động nếu hệ thống chưa launch (tradingOpen == false)
    // Đọc trạng thái từ LaunchToken thông qua interface ILaunchToken
    modifier onlyAfterLaunch() {
        require(
            ILaunchToken(address(token)).tradingOpen(),
            "TokenLocker: system not launched yet"
        );
        _; // Dấu này nghĩa là: "nếu require pass thì chạy tiếp hàm bên dưới"
    }

    // CONSTRUCTOR

    /**
     * @dev Khởi tạo contract, lưu địa chỉ token và accessManager
     * @param _token Địa chỉ của LaunchToken (ERC-20)
     * @param _accessManager Địa chỉ của AccessManager (RBAC)
     */
    constructor(address _token, address _accessManager) {
        token = IERC20(_token);
        accessManager = IAccessManager(_accessManager);
    }

    // FUNCTIONS

    /**
     * @dev Khóa token trong khoảng thời gian nhất định
     * @param amount Số token muốn khóa (phải > 0)
     * @param duration Thời gian khóa tính bằng giây (ví dụ: 180 ngày = 15552000 giây)
     *
     * Điều kiện:
     * - Hệ thống phải đã launch (tradingOpen == true)
     * - amount phải > 0
     * - User phải approve cho contract này trước khi gọi lock
     */
    function lock(uint256 amount, uint256 duration) external onlyAfterLaunch {
        // Không cho khóa 0 token (vô nghĩa)
        require(amount > 0, "TokenLocker: amount must be > 0");

        // Không cho duration = 0 (khóa 0 giây thì không cần khóa)
        require(duration > 0, "TokenLocker: duration must be > 0");

        // Chuyển token từ ví user sang contract này
        // User phải gọi token.approve(addressTokenLocker, amount) TRƯỚC khi gọi lock()
        // Nếu chưa approve đủ → dòng này tự revert
        token.transferFrom(msg.sender, address(this), amount);

        // Tính thời điểm mở khóa = thời điểm hiện tại + thời gian khóa
        uint256 unlockTime = block.timestamp + duration;

        // Tạo LockInfo mới và push vào mảng của user
        // lockId chính là index trong mảng (0, 1, 2, ...)
        userLocks[msg.sender].push(LockInfo({
            amount: amount,
            unlockTime: unlockTime,
            isReleased: false           // Chưa rút, mới khóa
        }));

        // Lấy lockId (index cuối cùng vừa push vào)
        uint256 lockId = userLocks[msg.sender].length - 1;

        // Phát event để ghi nhật ký lên blockchain
        emit Locked(msg.sender, lockId, amount, unlockTime);
    }

    /**
     * @dev Rút token đã khóa khi đáo hạn
     * @param lockId Index của lock trong mảng userLocks (bắt đầu từ 0)
     *
     * Điều kiện:
     * - lockId phải tồn tại (không vượt quá số lock của user)
     * - Lock chưa được rút (isReleased == false)
     * - Đã qua thời gian khóa (block.timestamp >= unlockTime)
     */
    function unlock(uint256 lockId) external {
        // Check 1: lockId có hợp lệ không?
        // Nếu user có 3 lock (index 0,1,2) mà gọi unlock(5) → revert
        require(lockId < userLocks[msg.sender].length, "TokenLocker: invalid lockId");

        // Lấy reference đến lock cần mở (dùng storage vì cần thay đổi giá trị)
        // storage = trỏ trực tiếp vào blockchain, thay đổi nó = thay đổi dữ liệu thật
        // memory = copy ra bộ nhớ tạm, thay đổi nó KHÔNG ảnh hưởng blockchain
        LockInfo storage lockInfo = userLocks[msg.sender][lockId];

        // Check 2: đã rút trước đó chưa?
        require(!lockInfo.isReleased, "TokenLocker: already released");

        // Check 3: đã đến hạn chưa?
        // block.timestamp = thời gian hiện tại trên blockchain (đơn vị: giây)
        require(block.timestamp >= lockInfo.unlockTime, "TokenLocker: not yet unlocked");

        // QUAN TRỌNG: Đánh dấu đã rút TRƯỚC khi chuyển token
        // Đây là pattern "Checks-Effects-Interactions" để chống reentrancy attack
        // Nếu chuyển token trước rồi mới đánh dấu → hacker có thể gọi lại unlock()
        // trong lúc chuyển token chưa xong → rút nhiều lần
        lockInfo.isReleased = true;

        // Chuyển token từ contract về ví user
        token.transfer(msg.sender, lockInfo.amount);

        // Phát event
        emit Unlocked(msg.sender, lockId, lockInfo.amount);
    }

    // VIEW FUNCTIONS
    // Hàm view = chỉ đọc dữ liệu, KHÔNG tốn gas khi gọi từ bên ngoài
    // (chỉ tốn gas nếu được gọi từ trong 1 transaction khác)

    /**
     * @dev Trả về số lượng lock của 1 user
     * @param user Địa chỉ ví cần kiểm tra
     */
    function getLockCount(address user) external view returns (uint256) {
        return userLocks[user].length;
    }

    /**
     * @dev Trả về thông tin chi tiết của 1 lock
     * @param user Địa chỉ ví
     * @param lockId Index của lock (bắt đầu từ 0)
     * @return amount Số token bị khóa
     * @return unlockTime Thời điểm mở khóa (Unix timestamp)
     * @return isReleased Đã rút chưa
     */
    function getLockInfo(address user, uint256 lockId)
        external
        view
        returns (uint256 amount, uint256 unlockTime, bool isReleased)
    {
        require(lockId < userLocks[user].length, "TokenLocker: invalid lockId");
        LockInfo storage info = userLocks[user][lockId];
        return (info.amount, info.unlockTime, info.isReleased);
    }
}
