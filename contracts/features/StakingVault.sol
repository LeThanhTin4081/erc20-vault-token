// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAirdropPoints {
    function addPoints(address user, uint256 points) external;
}

// Interface để đọc trạng thái launch từ LaunchToken
interface ILaunchToken {
    function tradingOpen() external view returns (bool);
}

/**
 * @title StakingVault
 * @dev Cho phép người dùng Stake Token vào để lấy thưởng.
 * Update số điểm sang AirdropPoints.
 */
contract StakingVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // STATE VARIABLES

    uint256 public constant rewardRate = 1e18;
    uint256 public constant ACC_REWARD_PRECISION = 1e12;

    IERC20 public immutable stakingToken;
    IAirdropPoints public immutable airdropPoints;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 unclaimedRewards;
    }

    mapping(address => UserInfo) public userInfo;

    uint256 public totalStaked;
    uint256 public lastRewardTime;
    uint256 public accRewardPerShare;
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event EmergencyWithdrawn(address indexed user, uint256 amount);
    event PoolUpdated(uint256 lastRewardTime, uint256 accRewardPerShare);

    constructor(address _stakingToken, address _airdropPoints) {
        require(_stakingToken != address(0), "StakingVault: invalid staking token");
        require(_airdropPoints != address(0), "StakingVault: invalid airdrop points");

        stakingToken = IERC20(_stakingToken);
        airdropPoints = IAirdropPoints(_airdropPoints);
        lastRewardTime = block.timestamp;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingVault: amount must be > 0");

        updatePool();

        UserInfo storage user = userInfo[msg.sender];
        user.unclaimedRewards += _pendingFromPool(user);

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        user.amount += amount;
        totalStaked += amount;
        user.rewardDebt = _accumulatedReward(user.amount);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingVault: amount must be > 0");

        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "StakingVault: insufficient stake");

        updatePool();

        user.unclaimedRewards += _pendingFromPool(user);
        user.amount -= amount;
        totalStaked -= amount;
        user.rewardDebt = _accumulatedReward(user.amount);

        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        updatePool();

        UserInfo storage user = userInfo[msg.sender];
        uint256 reward = user.unclaimedRewards + _pendingFromPool(user);

        user.unclaimedRewards = 0;
        user.rewardDebt = _accumulatedReward(user.amount);

        if (reward == 0) {
            return;
        }

        airdropPoints.addPoints(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    function emergencyWithdraw() external nonReentrant {
        updatePool();

        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        require(amount > 0, "StakingVault: nothing to withdraw");

        totalStaked -= amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.unclaimedRewards = 0;

        stakingToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdrawn(msg.sender, amount);
    }

    function pendingRewards(address account) external view returns (uint256) {
        UserInfo storage user = userInfo[account];
        uint256 currentAccRewardPerShare = accRewardPerShare;

        if (block.timestamp > lastRewardTime && totalStaked != 0) {
            uint256 reward = (block.timestamp - lastRewardTime) * rewardRate;
            currentAccRewardPerShare += (reward * ACC_REWARD_PRECISION) / totalStaked;
        }

        uint256 accumulated = (user.amount * currentAccRewardPerShare) / ACC_REWARD_PRECISION;
        return user.unclaimedRewards + accumulated - user.rewardDebt;
    }

    function updatePool() public {
        if (block.timestamp <= lastRewardTime) {
            return;
        }

        if (totalStaked == 0) {
            lastRewardTime = block.timestamp;
            emit PoolUpdated(lastRewardTime, accRewardPerShare);
            return;
        }

        uint256 reward = (block.timestamp - lastRewardTime) * rewardRate;
        accRewardPerShare += (reward * ACC_REWARD_PRECISION) / totalStaked;
        lastRewardTime = block.timestamp;

        emit PoolUpdated(lastRewardTime, accRewardPerShare);
    }

    function _pendingFromPool(UserInfo storage user) internal view returns (uint256) {
        if (user.amount == 0) {
            return 0;
        }

        return _accumulatedReward(user.amount) - user.rewardDebt;
    }

    function _accumulatedReward(uint256 amount) internal view returns (uint256) {
        return (amount * accRewardPerShare) / ACC_REWARD_PRECISION;
    }
}
