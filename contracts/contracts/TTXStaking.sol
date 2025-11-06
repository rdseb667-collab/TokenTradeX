// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TTXStaking - Staking rewards for TTX token holders
 * @notice Stake TTX tokens to earn trading fee rewards
 */
contract TTXStaking is Ownable, ReentrancyGuard {
    
    IERC20 public ttxToken;
    
    // Staking info
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
    }
    
    mapping(address => Stake) public stakes;
    
    uint256 public totalStaked;
    uint256 public rewardPool;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    
    // Reward rate: tokens per second per staked token
    uint256 public rewardRate = 1e15; // 0.001 tokens per second (adjustable)
    
    // Lock periods and multipliers
    uint256 public constant NO_LOCK = 0;
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    
    mapping(address => uint256) public stakeLockEnd;
    mapping(address => uint256) public lockMultiplier; // 100 = 1x, 150 = 1.5x
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardAdded(uint256 amount);
    
    constructor(address _ttxToken) {
        require(_ttxToken != address(0), "Invalid token address");
        ttxToken = IERC20(_ttxToken);
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Update reward variables
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            stakes[account].rewardDebt = earned(account);
        }
        _;
    }
    
    /**
     * @dev Calculate reward per token
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + 
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalStaked);
    }
    
    /**
     * @dev Calculate earned rewards for an account
     */
    function earned(address account) public view returns (uint256) {
        Stake memory userStake = stakes[account];
        uint256 multiplier = lockMultiplier[account] > 0 ? lockMultiplier[account] : 100;
        
        return ((userStake.amount * (rewardPerToken() - rewardPerTokenStored)) / 1e18) * multiplier / 100 + userStake.rewardDebt;
    }
    
    /**
     * @dev Stake tokens with optional lock period
     */
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(
            lockPeriod == NO_LOCK || 
            lockPeriod == LOCK_30_DAYS || 
            lockPeriod == LOCK_90_DAYS || 
            lockPeriod == LOCK_180_DAYS,
            "Invalid lock period"
        );
        
        // Transfer tokens from user
        ttxToken.transferFrom(msg.sender, address(this), amount);
        
        // Update stake
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].timestamp = block.timestamp;
        totalStaked += amount;
        
        // Set lock period and multiplier
        if (lockPeriod > 0) {
            stakeLockEnd[msg.sender] = block.timestamp + lockPeriod;
            
            if (lockPeriod == LOCK_30_DAYS) {
                lockMultiplier[msg.sender] = 110; // 1.1x
            } else if (lockPeriod == LOCK_90_DAYS) {
                lockMultiplier[msg.sender] = 125; // 1.25x
            } else if (lockPeriod == LOCK_180_DAYS) {
                lockMultiplier[msg.sender] = 150; // 1.5x
            }
        } else {
            lockMultiplier[msg.sender] = 100; // 1x (no bonus)
        }
        
        emit Staked(msg.sender, amount, lockPeriod);
    }
    
    /**
     * @dev Unstake tokens
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        require(block.timestamp >= stakeLockEnd[msg.sender], "Tokens still locked");
        
        // Update stake
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back to user
        ttxToken.transfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = stakes[msg.sender].rewardDebt;
        require(reward > 0, "No rewards to claim");
        require(rewardPool >= reward, "Insufficient reward pool");
        
        stakes[msg.sender].rewardDebt = 0;
        rewardPool -= reward;
        
        ttxToken.transfer(msg.sender, reward);
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    /**
     * @dev Add rewards to the pool (called by fee distribution)
     */
    function addReward(uint256 amount) external {
        require(amount > 0, "Cannot add 0 reward");
        
        ttxToken.transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        
        emit RewardAdded(amount);
    }
    
    /**
     * @dev Update reward rate (owner only)
     */
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        rewardRate = _rewardRate;
    }
    
    /**
     * @dev Get user staking info
     */
    function getUserInfo(address account) external view returns (
        uint256 stakedAmount,
        uint256 pendingReward,
        uint256 lockEndTime,
        uint256 multiplier
    ) {
        Stake memory userStake = stakes[account];
        return (
            userStake.amount,
            earned(account),
            stakeLockEnd[account],
            lockMultiplier[account]
        );
    }
}
