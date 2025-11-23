// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TTX Reserve Token
 * @dev Growth-focused token with multiple revenue streams shared with holders
 * Total supply: 1 Billion TTX (FIXED)
 * Distribution optimized for market cap growth and early adopter rewards
 * 
 * ⚠️ DEPRECATED - Nov 2025
 * This contract is RETIRED. Use TTXUnified.sol instead.
 * Reason: Conflicting tokenomics (70% holder share vs 15% unified model)
 * Migration: All new deployments use TTXUnified.sol with clean 85/15 split
 */
contract TTXReserveToken is ERC20, Ownable, ReentrancyGuard {
    // Token distribution - Growth focused
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion
    uint256 public constant CIRCULATING_SUPPLY = 500_000_000 * 10**18; // 50% - Public
    uint256 public constant PLATFORM_RESERVE = 300_000_000 * 10**18; // 30% - Platform operational
    uint256 public constant TEAM_ALLOCATION = 100_000_000 * 10**18; // 10% - Vested 4 years
    uint256 public constant COMMUNITY_REWARDS = 100_000_000 * 10**18; // 10% - Airdrops, competitions

    // Revenue sharing pools (ALL holders benefit)
    struct RevenueStream {
        string name;
        uint256 totalCollected;
        uint256 distributedToHolders;
        bool isActive;
    }
    
    RevenueStream[] public revenueStreams;
    uint256 public totalRevenueCollected;
    uint256 public revenueSharePercentage = 7000; // 70% to holders, 30% to platform
    
    // Early adopter multipliers
    mapping(address => uint256) public earlyAdopterMultiplier; // 1x to 3x bonus
    uint256 public earlyAdopterCutoffBlock;
    
    // Fee discount tiers - More generous for growth
    struct FeeTier {
        uint256 minBalance;
        uint256 discountBps; // basis points
        uint256 revenueShareMultiplier; // 100 = 1x, 200 = 2x
    }

    FeeTier[] public feeTiers;

    // Reserve tracking
    mapping(address => uint256) public reserveAllocations; // Tracks what instruments are backed
    uint256 public totalReserveAllocated;
    
    // Vesting
    mapping(address => VestingSchedule) public vestingSchedules;
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliffDuration;
    }

    // Events
    event RevenueCollected(uint256 indexed streamId, uint256 amount, uint256 holderShare);
    event RevenueShareClaimed(address indexed user, uint256 amount);
    event EarlyAdopterMarked(address indexed user, uint256 multiplier);
    event FeeTierUpdated(uint256 indexed tierId, uint256 minBalance, uint256 discountBps, uint256 multiplier);
    event TokensVested(address indexed beneficiary, uint256 amount);
    event CommunityRewardDistributed(address indexed recipient, uint256 amount);

    constructor() ERC20("TokenTradeX Token", "TTX") {
        // Mint total supply to contract
        _mint(address(this), TOTAL_SUPPLY);
        
        // Set early adopter cutoff (first 100,000 blocks = ~2 weeks)
        earlyAdopterCutoffBlock = block.number + 100000;

        // Initialize generous fee tiers for growth
        feeTiers.push(FeeTier(100 * 10**18, 1000, 110)); // 100 TTX = 10% discount + 1.1x revenue
        feeTiers.push(FeeTier(1_000 * 10**18, 2000, 125)); // 1K TTX = 20% discount + 1.25x revenue
        feeTiers.push(FeeTier(10_000 * 10**18, 3500, 150)); // 10K TTX = 35% discount + 1.5x revenue
        feeTiers.push(FeeTier(100_000 * 10**18, 5000, 200)); // 100K TTX = 50% discount + 2x revenue
        feeTiers.push(FeeTier(1_000_000 * 10**18, 7000, 300)); // 1M TTX = 70% discount + 3x revenue (whales)
        
        // Initialize 10 revenue streams
        revenueStreams.push(RevenueStream("Trading Fees", 0, 0, true));
        revenueStreams.push(RevenueStream("Withdrawal Fees", 0, 0, true));
        revenueStreams.push(RevenueStream("Premium Subscriptions", 0, 0, true));
        revenueStreams.push(RevenueStream("API Licensing", 0, 0, true));
        revenueStreams.push(RevenueStream("Market Making", 0, 0, true));
        revenueStreams.push(RevenueStream("Lending Interest", 0, 0, true));
        revenueStreams.push(RevenueStream("Staking Commissions", 0, 0, true));
        revenueStreams.push(RevenueStream("Copy Trading Fees", 0, 0, true));
        revenueStreams.push(RevenueStream("White Label Licensing", 0, 0, true));
        revenueStreams.push(RevenueStream("Token Appreciation", 0, 0, true));
    }

    /**
     * @dev Mark early adopters for bonus rewards
     * First buyers get 2-3x revenue share multiplier
     */
    function markEarlyAdopter(address user, uint256 multiplier) external onlyOwner {
        require(block.number <= earlyAdopterCutoffBlock, "Early adopter period ended");
        require(multiplier >= 100 && multiplier <= 300, "Invalid multiplier");
        earlyAdopterMultiplier[user] = multiplier;
    }
    
    /**
     * @dev Collect revenue from any of the 10 streams
     */
    function collectRevenue(uint256 streamId, uint256 amount) external payable onlyOwner {
        require(streamId < revenueStreams.length, "Invalid stream");
        require(revenueStreams[streamId].isActive, "Stream not active");
        
        revenueStreams[streamId].totalCollected += amount;
        totalRevenueCollected += amount;
        
        // Calculate holder share (70%)
        uint256 holderShare = (amount * revenueSharePercentage) / 10000;
        revenueStreams[streamId].distributedToHolders += holderShare;
        
        emit RevenueCollected(streamId, amount, holderShare);
    }
    
    /**
     * @dev Claim revenue share (any holder can claim)
     */
    function claimRevenueShare() external nonReentrant {
        uint256 userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "No TTX balance");
        
        // Calculate user's share based on holdings
        uint256 totalCirculating = TOTAL_SUPPLY - balanceOf(address(this));
        uint256 userShare = (totalRevenueCollected * userBalance) / totalCirculating;
        
        // Apply tier multiplier
        (, , uint256 multiplier) = this.getUserFeeTier(msg.sender);
        userShare = (userShare * multiplier) / 100;
        
        // Apply early adopter bonus
        uint256 earlyBonus = earlyAdopterMultiplier[msg.sender];
        if (earlyBonus > 0) {
            userShare = (userShare * earlyBonus) / 100;
        }
        
        // Transfer revenue share (simplified - in production use proper accounting)
        require(address(this).balance >= userShare, "Insufficient contract balance");
        payable(msg.sender).transfer(userShare);
        
        emit RevenueShareClaimed(msg.sender, userShare);
    }

    /**
     * @dev Get user's fee discount tier with revenue multiplier
     */
    function getUserFeeTier(address user) external view returns (
        uint256 tierId,
        uint256 discountBps,
        uint256 revenueMultiplier
    ) {
        uint256 balance = balanceOf(user);
        
        // Find highest tier user qualifies for
        for (uint256 i = feeTiers.length; i > 0; i--) {
            if (balance >= feeTiers[i - 1].minBalance) {
                return (i - 1, feeTiers[i - 1].discountBps, feeTiers[i - 1].revenueShareMultiplier);
            }
        }
        
        return (0, 0, 100); // No tier = base 1x multiplier
    }

    /**
     * @dev Calculate discounted fee
     */
    function calculateDiscountedFee(address user, uint256 baseFee) external view returns (uint256) {
        (, uint256 discountBps, ) = this.getUserFeeTier(user);
        
        if (discountBps == 0) {
            return baseFee;
        }
        
        uint256 discount = (baseFee * discountBps) / 10000;
        return baseFee - discount;
    }

    /**
     * @dev Setup vesting schedule for team/advisors
     */
    function setupVesting(
        address beneficiary,
        uint256 amount,
        uint256 duration,
        uint256 cliffDuration
    ) external onlyOwner {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting already exists");
        require(amount <= TEAM_ALLOCATION, "Exceeds team allocation");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: block.timestamp,
            duration: duration,
            cliffDuration: cliffDuration
        });
    }

    /**
     * @dev Release vested tokens
     */
    function releaseVestedTokens() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(block.timestamp >= schedule.startTime + schedule.cliffDuration, "Cliff not reached");
        
        uint256 elapsed = block.timestamp - schedule.startTime;
        uint256 vested;
        
        if (elapsed >= schedule.duration) {
            vested = schedule.totalAmount;
        } else {
            vested = (schedule.totalAmount * elapsed) / schedule.duration;
        }
        
        uint256 releasable = vested - schedule.releasedAmount;
        require(releasable > 0, "No tokens to release");
        
        schedule.releasedAmount += releasable;
        _transfer(address(this), msg.sender, releasable);
        
        emit TokensVested(msg.sender, releasable);
    }

    /**
     * @dev Distribute tokens from rewards pool
     */
    function distributeReward(address recipient, uint256 amount) external onlyOwner {
        require(amount <= REWARDS_POOL, "Exceeds rewards pool");
        _transfer(address(this), recipient, amount);
    }

    /**
     * @dev Get available reserve
     */
    function getAvailableReserve() external view returns (uint256) {
        return INSTRUMENT_BACKING_RESERVE - totalReserveAllocated;
    }

    /**
     * @dev Update fee tier
     */
    function updateFeeTier(
        uint256 tierId,
        uint256 minBalance,
        uint256 discountBps,
        bool revenueShareEnabled
    ) external onlyOwner {
        require(tierId < feeTiers.length, "Invalid tier");
        require(discountBps <= 10000, "Invalid discount");
        
        feeTiers[tierId] = FeeTier(minBalance, discountBps, revenueShareEnabled);
        emit FeeTierUpdated(tierId, minBalance, discountBps);
    }

    /**
     * @dev Emergency withdrawal (only from emergency reserve)
     */
    function emergencyWithdraw(address recipient, uint256 amount) external onlyOwner {
        require(amount <= EMERGENCY_RESERVE, "Exceeds emergency reserve");
        _transfer(address(this), recipient, amount);
    }
}
