// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";

// contract Staking is ReentrancyGuard, AccessControl {
//     bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

//     IERC20 public immutable token;

//     uint256 public rewardRate;

//     struct StakeInfo {
//         uint256 amount;
//         uint256 rewardDebt;
//         uint64 lastUpdate;
//     }

//     mapping(address => StakeInfo) public stakes;

//     event Staked(address indexed user, uint256 amount);
//     event Unstaked(address indexed user, uint256 amount);
//     event Claimed(address indexed user, uint256 reward);

//     constructor(address _token, uint256 _rewardRate, address admin) {
//         token = IERC20(_token);
//         rewardRate = _rewardRate;

//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(OPERATOR_ROLE, admin);
//     }

//     // =========================
//     // INTERNAL CALC REWARD
//     // =========================
//     function _pending(address user) internal view returns (uint256) {
//         StakeInfo memory s = stakes[user];

//         if (s.amount == 0) return 0;

//         uint256 time = block.timestamp - s.lastUpdate;
//         return (s.amount * rewardRate * time) / 1e18;
//     }

//     // =========================
//     // STAKE
//     // =========================
//     function stake(uint256 amount) external nonReentrant {
//         require(amount > 0, "Invalid amount");

//         StakeInfo storage s = stakes[msg.sender];

//         uint256 pending = _pending(msg.sender);
//         s.rewardDebt += pending;

//         require(
//             token.transferFrom(msg.sender, address(this), amount),
//             "Transfer failed"
//         );

//         s.amount += amount;
//         s.lastUpdate = uint64(block.timestamp);

//         emit Staked(msg.sender, amount);
//     }

//     // =========================
//     // UNSTAKE
//     // =========================
//     function unstake(uint256 amount) external nonReentrant {
//         StakeInfo storage s = stakes[msg.sender];

//         require(s.amount >= amount, "Not enough");

//         uint256 pending = _pending(msg.sender);
//         s.rewardDebt += pending;

//         s.amount -= amount;
//         s.lastUpdate = uint64(block.timestamp);

//         require(token.transfer(msg.sender, amount), "Transfer failed");

//         emit Unstaked(msg.sender, amount);
//     }

//     // =========================
//     // CLAIM REWARD
//     // =========================
//     function claim() external nonReentrant {
//         StakeInfo storage s = stakes[msg.sender];

//         uint256 pending = _pending(msg.sender);
//         uint256 totalReward = s.rewardDebt + pending;

//         require(totalReward > 0, "No reward");

//         s.rewardDebt = 0;
//         s.lastUpdate = uint64(block.timestamp);

//         require(token.transfer(msg.sender, totalReward), "Transfer failed");

//         emit Claimed(msg.sender, totalReward);
//     }

//     // =========================
//     // ADMIN
//     // =========================
//     function setRewardRate(uint256 _rate) external onlyRole(OPERATOR_ROLE) {
//         rewardRate = _rate;
//     }
// }
