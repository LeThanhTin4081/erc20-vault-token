// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";

// contract Vesting is ReentrancyGuard, AccessControl {
//     bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

//     IERC20 public immutable token;

//     struct VestingInfo {
//         uint256 total;      // tổng token lock
//         uint256 claimed;    // đã claim
//         uint64 start;       // thời gian bắt đầu
//         uint64 cliff;       // thời gian cliff
//         uint64 duration;    // tổng thời gian vesting
//     }

//     mapping(address => VestingInfo[]) public vestings;

//     event VestingCreated(address indexed user, uint256 amount);
//     event Claimed(address indexed user, uint256 amount);

//     constructor(address _token, address admin) {
//         require(_token != address(0), "Invalid token");

//         token = IERC20(_token);

//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(OPERATOR_ROLE, admin);
//     }

//     // =========================
//     // CREATE VESTING (LOCK TOKEN)
//     // =========================
//     function createVesting(
//         address user,
//         uint256 amount,
//         uint64 start,
//         uint64 cliff,
//         uint64 duration
//     ) external onlyRole(OPERATOR_ROLE) {
//         require(user != address(0), "Invalid user");
//         require(amount > 0, "Invalid amount");
//         require(duration > 0, "Invalid duration");
//         require(cliff <= duration, "Cliff > duration");

//         // transfer token từ admin vào contract
//         require(
//             token.transferFrom(msg.sender, address(this), amount),
//             "Transfer failed"
//         );

//         vestings[user].push(
//             VestingInfo({
//                 total: amount,
//                 claimed: 0,
//                 start: start,
//                 cliff: cliff,
//                 duration: duration
//             })
//         );

//         emit VestingCreated(user, amount);
//     }

//     // =========================
//     // VIEW CLAIMABLE
//     // =========================
//     function claimable(address user, uint256 index)
//         public
//         view
//         returns (uint256)
//     {
//         VestingInfo memory v = vestings[user][index];

//         if (block.timestamp < v.start + v.cliff) {
//             return 0;
//         }

//         if (block.timestamp >= v.start + v.duration) {
//             return v.total - v.claimed;
//         }

//         uint256 vested = (v.total * (block.timestamp - v.start)) / v.duration;

//         return vested - v.claimed;
//     }

//     // =========================
//     // CLAIM TOKEN
//     // =========================
//     function claim(uint256 index) external nonReentrant {
//         VestingInfo storage v = vestings[msg.sender][index];

//         uint256 amount = claimable(msg.sender, index);
//         require(amount > 0, "Nothing to claim");

//         v.claimed += amount;

//         require(token.transfer(msg.sender, amount), "Transfer failed");

//         emit Claimed(msg.sender, amount);
//     }

//     // =========================
//     // VIEW
//     // =========================
//     function getUserVestings(address user)
//         external
//         view
//         returns (VestingInfo[] memory)
//     {
//         return vestings[user];
//     }
// }