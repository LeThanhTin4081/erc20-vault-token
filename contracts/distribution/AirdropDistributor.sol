// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAirdropPoints {
    function getPoints(address user, uint256 snapshotId) external view returns (uint256);
}

interface ITreasury {
    function token() external view returns (IERC20);
}

/**
 * @title AirdropDistributor
 * @dev Nơi người dùng thực hiện nhận tiền Airdrop.
 * Khớp điểm của AirdropPoints, và rút tiền từ quỹ allowance của Treasury.
 */
contract AirdropDistributor is ReentrancyGuard {
    
    // STATE VARIABLES

    IAirdropPoints public airdropPoints;
    ITreasury public treasury;

    // Tỷ lệ quy đổi điểm ra token: 1 point = 1 wei/token
    // Có thể cấu hình thêm biến này nếu cần, mặc định cho 1:1 theo ether
    uint256 public rewardPerPoint = 1e18; // 1 điểm = 1 token (giả sử 18 decimals)

    // Đánh dấu người dùng đã nhận phần thưởng theo từng đợt
    // snapshotId => (user => claimed status)
    mapping(uint256 => mapping(address => bool)) public claimed;

    // EVENTS

    event Claimed(address indexed user, uint256 snapshotId, uint256 amount);

    // CONSTRUCTOR

    constructor(address _airdropPoints, address _treasury) {
        require(_airdropPoints != address(0), "Invalid AirdropPoints address");
        require(_treasury != address(0), "Invalid Treasury address");
        airdropPoints = IAirdropPoints(_airdropPoints);
        treasury = ITreasury(_treasury);
    }

    // CORE FUNCTIONS

    /**
     * @dev User gọi để claim Airdrop
     */
    function claim(uint256 snapshotId) external nonReentrant {
        // 1. Kiểm tra claimed[snapshotId][msg.sender] == false
        require(!claimed[snapshotId][msg.sender], "AirdropDistributor: already claimed");

        // 2. Tính toán tiền theo điểm từ AirdropPoints (getPoints)
        uint256 amount = calculateReward(msg.sender, snapshotId);
        require(amount > 0, "AirdropDistributor: zero reward");

        // 3. Mark claimed = true
        claimed[snapshotId][msg.sender] = true;

        // 4. transferFrom quỹ của Treasury -> User
        IERC20 token = treasury.token();
        require(
            token.transferFrom(address(treasury), msg.sender, amount),
            "AirdropDistributor: transfer failed"
        );

        emit Claimed(msg.sender, snapshotId, amount);
    }

    // VIEW FUNCTIONS

    /**
     * @dev Hàm xem trước số tiền User sẽ nhận được nếu claim
     */
    function calculateReward(address user, uint256 snapshotId) public view returns (uint256) {
        // Công thức quy đổi Point -> Token
        uint256 points = airdropPoints.getPoints(user, snapshotId);
        return points * rewardPerPoint;
    }
}
