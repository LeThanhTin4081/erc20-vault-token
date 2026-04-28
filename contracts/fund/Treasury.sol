// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import interface ERC-20 chuẩn từ OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Treasury
 * @dev Két tiền quản lý quỹ token của hệ thống.
 * Chứa 20% token cộng đồng để phân phối airdrop.
 * Cung cấp API để approve cho các hợp đồng phân phối (Distributor).
 * KHÔNG chứa logic airdrop hay staking — chỉ giữ tiền và cấp quyền rút.
 */

// Interface nhỏ để gọi hàm của AccessManager (check quyền)
interface IAccessManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

contract Treasury {

    // STATE VARIABLES

    // Địa chỉ token ERC-20 (LaunchToken)
    IERC20 public token;

    // Địa chỉ AccessManager (để check quyền admin)
    IAccessManager public accessManager;

    // Constant: role admin (phải giống hệt khai báo trong AccessManager.sol)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // EVENTS

    // Khi ai đó nạp token vào Treasury
    event Deposited(address indexed from, uint256 amount);

    // Khi admin rút token ra khỏi Treasury
    event Withdrawn(address indexed to, uint256 amount);

    // Khi admin cấp allowance cho 1 contract được rút token
    event SpenderApproved(address indexed spender, uint256 amount);

    // MODIFIER

    // Chỉ cho phép tài khoản có ADMIN_ROLE gọi hàm
    // Gọi sang AccessManager để kiểm tra
    modifier onlyAdmin() {
        require(
            accessManager.hasRole(ADMIN_ROLE, msg.sender),
            "Treasury: caller is not admin"
        );
        _;
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
     * @dev Nạp token vào Treasury (ai cũng gọi được)
     * @param amount Số token muốn nạp
     *
     * User phải gọi token.approve(addressTreasury, amount) TRƯỚC khi gọi deposit()
     */
    function deposit(uint256 amount) external {
        // Không cho nạp 0 token
        require(amount > 0, "Treasury: amount must be > 0");

        // Chuyển token từ ví người gọi → Treasury
        // Nếu chưa approve đủ → tự revert
        token.transferFrom(msg.sender, address(this), amount);

        // Phát event ghi nhật ký
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Rút token ra khỏi Treasury (CHỈ ADMIN)
     * @param to Địa chỉ nhận token
     * @param amount Số token muốn rút
     *
     * Theo README mục 2.6: "withdraw chỉ dành cho admin"
     * Theo ke_hoach mục 4: "Tổng reward claim không được vượt quá số dư Treasury"
     */
    function withdraw(address to, uint256 amount) external onlyAdmin {
        // Không cho rút 0 token
        require(amount > 0, "Treasury: amount must be > 0");

        // Không cho rút tới địa chỉ 0 (đốt token vô tình)
        require(to != address(0), "Treasury: cannot withdraw to zero address");

        // Kiểm tra Treasury có đủ token không
        // Tránh trường hợp rút quá số dư → revert không rõ lý do
        require(token.balanceOf(address(this)) >= amount, "Treasury: insufficient balance");

        // Chuyển token từ Treasury → địa chỉ nhận
        token.transfer(to, amount);

        // Phát event
        emit Withdrawn(to, amount);
    }

    /**
     * @dev Cấp allowance cho contract Distributor được rút token từ Treasury (CHỈ ADMIN)
     * @param spender Địa chỉ contract được phép rút (thường là AirdropDistributor)
     * @param amount Số token tối đa được rút
     *
     * Theo README mục 6: "Race condition khi approve → reset về 0 trước"
     * Giải thích: Nếu allowance hiện tại = 500, admin muốn đổi thành 300,
     * hacker có thể lợi dụng khoảnh khắc giữa 2 giao dịch để rút 500 + 300 = 800.
     * Cách xử lý: reset về 0 trước → rồi mới set giá trị mới.
     */
    function approveSpender(address spender, uint256 amount) external onlyAdmin {
        // Không cho approve cho địa chỉ 0
        require(spender != address(0), "Treasury: cannot approve zero address");

        // XỬ LÝ RACE CONDITION
        // Bước 1: Kiểm tra allowance hiện tại
        uint256 currentAllowance = token.allowance(address(this), spender);

        // Bước 2: Nếu allowance hiện tại > 0, reset về 0 trước
        // Điều này ngăn hacker rút cả giá trị cũ lẫn giá trị mới
        if (currentAllowance > 0) {
            token.approve(spender, 0);
        }

        // Bước 3: Set allowance mới
        token.approve(spender, amount);

        // Phát event
        emit SpenderApproved(spender, amount);
    }

    // VIEW FUNCTIONS

    /**
     * @dev Xem số dư token hiện tại trong Treasury
     * @return Số token đang giữ trong contract
     */
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
