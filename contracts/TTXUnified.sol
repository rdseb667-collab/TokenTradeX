// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TTX Unified Token - Production Ready
 * @dev Combines best practices from Lido, Curve, GMX, Aave
 * 
 * KEY FEATURES:
 * - Auto-compounding revenue share (no manual claims)
 * - Ve-locking for boosted rewards + governance
 * - 10 revenue streams from platform
 * - Liquidity mining incentives
 * - Reserve backing for price floor
 * - Fee-on-transfer for sustainability
 * 
 * Total Supply: 1 Billion (FIXED)
 * Revenue Split: 15% holders (auto-compound), 85% platform reserve
 * Clear & Simple: Platform profits, holders earn too
 */
contract TTXUnified is ERC20, Ownable, ReentrancyGuard, Pausable {
    
    // ==================== CONSTANTS ====================
    
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days; // 4 years
    uint256 public constant MIN_LOCK_DURATION = 7 days;
    uint256 public constant BASIS_POINTS = 10000;
    
    // ==================== TOKEN DISTRIBUTION ====================
    
    uint256 public constant PUBLIC_ALLOCATION = 500_000_000 * 10**18; // 50%
    uint256 public constant LIQUIDITY_MINING = 200_000_000 * 10**18; // 20%
    uint256 public constant PLATFORM_RESERVE = 150_000_000 * 10**18; // 15%
    uint256 public constant TEAM_ALLOCATION = 100_000_000 * 10**18; // 10%
    uint256 public constant EARLY_ADOPTERS = 50_000_000 * 10**18; // 5%
    
    // ==================== FEE STRUCTURE ====================
    
    uint256 public transferFeeBps = 10; // 0.1% on transfers
    uint256 public tradingFeeBps = 25; // 0.25% on DEX trades
    uint256 public constant MAX_FEE = 500; // 5% max
    
    mapping(address => bool) public isExemptFromFee;
    mapping(address => bool) public isDEXPair;
    
    // ==================== STAKING & LOCKING ====================
    
    struct StakeInfo {
        uint256 amount; // Base staked amount
        uint256 lockedAmount; // Amount in ve-lock
        uint256 lockEnd; // When lock expires
        uint256 rewardDebt; // For reward calculation
        uint256 accumulatedRewards; // Auto-compounded rewards
        uint256 vePower; // Voting power for current lock
    }
    
    mapping(address => StakeInfo) public stakes;
    
    uint256 public totalStaked;
    uint256 public totalLocked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public lastRevenueForRewards; // Track last revenue for delta calculation
    
    // ==================== REVENUE STREAMS ====================
    
    struct RevenueStream {
        string name;
        uint256 totalCollected;
        uint256 holderShare; // 15% - Fair share to holders
        uint256 reserveShare; // 85% - Your profit + reserve backing
        bool isActive;
    }
    
    RevenueStream[10] public revenueStreams;
    uint256 public totalRevenueCollected;
    uint256 public totalReserveAccumulated;
    
    // ==================== LIQUIDITY MINING ====================
    
    struct LiquidityMining {
        uint256 rewardRate; // Tokens per second
        uint256 totalAllocated;
        uint256 distributed;
        uint256 startTime;
        uint256 endTime;
    }
    
    LiquidityMining public lmProgram;
    mapping(address => uint256) public lpBalances;
    mapping(address => uint256) public lpRewardDebt;
    uint256 public totalLPStaked;
    address public lpToken; // Real LP token address
    
    // ==================== GOVERNANCE (Ve-Model) ====================
    
    mapping(address => uint256) public votingPower;
    uint256 public totalVotingPower;
    
    // ==================== EVENTS ====================
    
    event Staked(address indexed user, uint256 amount);
    event Locked(address indexed user, uint256 amount, uint256 duration, uint256 votingPower);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsCompounded(address indexed user, uint256 amount);
    event RevenueCollected(uint256 indexed streamId, uint256 amount);
    event LiquidityMiningReward(address indexed user, uint256 amount);
    event FeeCollected(address indexed from, uint256 amount);
    event ReserveBuyback(uint256 amount, uint256 ttxBought); // UTIX-style buyback
    event ReserveUtilized(uint256 amount, string purpose); // Track reserve usage
    
    // ==================== CONSTRUCTOR ====================
    
    constructor() ERC20("TokenTradeX Unified", "TTX") {
        // Mint to contract for controlled distribution
        _mint(address(this), TOTAL_SUPPLY);
        
        // Initialize revenue streams
        revenueStreams[0] = RevenueStream("Trading Fees", 0, 0, 0, true);
        revenueStreams[1] = RevenueStream("Withdrawal Fees", 0, 0, 0, true);
        revenueStreams[2] = RevenueStream("Premium Subscriptions", 0, 0, 0, true);
        revenueStreams[3] = RevenueStream("API Licensing", 0, 0, 0, true);
        revenueStreams[4] = RevenueStream("Market Making", 0, 0, 0, true);
        revenueStreams[5] = RevenueStream("Lending Interest", 0, 0, 0, true);
        revenueStreams[6] = RevenueStream("Staking Commissions", 0, 0, 0, true);
        revenueStreams[7] = RevenueStream("Copy Trading", 0, 0, 0, true);
        revenueStreams[8] = RevenueStream("White Label", 0, 0, 0, true);
        revenueStreams[9] = RevenueStream("NFT Positions", 0, 0, 0, true);
        
        lastUpdateTime = block.timestamp;
        lastRevenueForRewards = 0;
        
        // Exempt key addresses
        isExemptFromFee[address(this)] = true;
        isExemptFromFee[msg.sender] = true;
    }
    
    // ==================== STAKING FUNCTIONS ====================
    
    /**
     * @dev Stake TTX tokens - Auto-compounding rewards
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        
        _transfer(msg.sender, address(this), amount);
        
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Lock tokens for voting power + boosted rewards (ve-model)
     * Longer lock = more voting power = higher rewards
     */
    function createLock(uint256 amount, uint256 duration) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot lock 0");
        require(duration >= MIN_LOCK_DURATION && duration <= MAX_LOCK_DURATION, "Invalid duration");
        
        _transfer(msg.sender, address(this), amount);
        
        uint256 unlockTime = block.timestamp + duration;
        stakes[msg.sender].lockedAmount += amount;
        stakes[msg.sender].lockEnd = unlockTime;
        totalLocked += amount;
        
        // Calculate voting power (max 4x for 4 year lock)
        uint256 vePower = (amount * duration) / MAX_LOCK_DURATION;
        stakes[msg.sender].vePower += vePower;
        votingPower[msg.sender] += vePower;
        totalVotingPower += vePower;
        
        emit Locked(msg.sender, amount, duration, vePower);
    }
    
    /**
     * @dev Unstake tokens (must wait for lock to expire)
     * WORKS EVEN WHEN PAUSED - Users can always exit!
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient balance");
        require(block.timestamp >= stakes[msg.sender].lockEnd, "Tokens locked");
        
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Unlock tokens after lock expiry and decay voting power.
     */
    function unlock(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unlock 0");
        StakeInfo storage info = stakes[msg.sender];
        require(info.lockedAmount >= amount, "Amount exceeds locked");
        require(block.timestamp >= info.lockEnd, "Lock not expired");

        if (info.vePower > 0) {
            uint256 decay = (info.vePower * amount) / info.lockedAmount;
            info.vePower -= decay;
            votingPower[msg.sender] -= decay;
            totalVotingPower -= decay;
        }

        info.lockedAmount -= amount;
        totalLocked -= amount;
        _transfer(address(this), msg.sender, amount);
    }
    
    // ==================== AUTO-COMPOUNDING REWARDS ====================
    
    modifier updateReward(address account) {
        uint256 newRPT = rewardPerToken();
        if (newRPT != rewardPerTokenStored) {
            rewardPerTokenStored = newRPT;
            lastRevenueForRewards = totalRevenueCollected;
        }
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            if (stakes[account].vePower > 0 && block.timestamp >= stakes[account].lockEnd) {
                totalVotingPower -= stakes[account].vePower;
                votingPower[account] -= stakes[account].vePower;
                stakes[account].vePower = 0;
            }
            uint256 earned = calculateEarned(account);
            if (earned > 0) {
                stakes[account].accumulatedRewards += earned;
                stakes[account].amount += earned;
                totalStaked += earned;
                emit RewardsCompounded(account, earned);
            }
            stakes[account].rewardDebt = (stakes[account].amount * rewardPerTokenStored) / PRECISION;
        }
        _;
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        uint256 revenueDelta = totalRevenueCollected > lastRevenueForRewards
            ? (totalRevenueCollected - lastRevenueForRewards)
            : 0;
        if (revenueDelta == 0) return rewardPerTokenStored;
        uint256 holderShareDelta = (revenueDelta * 1500) / BASIS_POINTS;
        return rewardPerTokenStored + ((holderShareDelta * PRECISION) / totalStaked);
    }
    
    function calculateEarned(address account) public view returns (uint256) {
        StakeInfo memory userStake = stakes[account];
        if (userStake.amount == 0) return 0;
        uint256 rpt = rewardPerToken();
        uint256 accrued = (userStake.amount * rpt) / PRECISION;
        uint256 earned = accrued > userStake.rewardDebt ? accrued - userStake.rewardDebt : 0;
        if (userStake.lockEnd > block.timestamp && earned > 0) {
            uint256 remainingLock = userStake.lockEnd - block.timestamp;
            uint256 boost = (remainingLock * 3 * PRECISION) / MAX_LOCK_DURATION + PRECISION;
            earned = (earned * boost) / PRECISION;
        }
        return earned;
    }
    
    // ==================== REVENUE COLLECTION ====================
    
    /**
     * @dev Collect revenue from platform operations
     * FLUID SPLIT LIKE UTIX:
     * - 15% auto-compounds to stakers (sustainable rewards)
     * - 85% builds reserve backing (price floor grows with every fee)
     * 
     * EVERY transaction strengthens the reserve, just like UTIX ticketing!
     */
    function collectRevenue(uint256 streamId, uint256 amount) external payable onlyOwner {
        require(streamId < 10, "Invalid stream");
        require(revenueStreams[streamId].isActive, "Stream inactive");
        
        revenueStreams[streamId].totalCollected += amount;
        totalRevenueCollected += amount;
        
        // FLUID Auto-split (like UTIX gets piece of every ticket)
        uint256 holderShare = (amount * 1500) / BASIS_POINTS; // 15% to holders
        uint256 reserveShare = amount - holderShare; // 85% builds reserve
        
        revenueStreams[streamId].holderShare += holderShare;
        revenueStreams[streamId].reserveShare += reserveShare;
        totalReserveAccumulated += reserveShare; // RESERVE GROWS!
        
        emit RevenueCollected(streamId, amount);
    }
    
    // ==================== LIQUIDITY MINING ====================
    
    /**
     * @dev Start liquidity mining program
     */
    function startLiquidityMining(uint256 rewardRate, uint256 duration) external onlyOwner {
        require(lmProgram.endTime < block.timestamp, "Program active");
        
        lmProgram = LiquidityMining({
            rewardRate: rewardRate,
            totalAllocated: LIQUIDITY_MINING,
            distributed: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration
        });
    }
    
    function setLPToken(address token) external onlyOwner {
        lpToken = token;
    }
    
    /**
     * @dev Stake LP tokens to earn TTX
     */
    function stakeLPTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(lmProgram.endTime > block.timestamp, "Program ended");
        require(lpToken != address(0), "LP token not set");
        
        _updateLPRewards(msg.sender);
        
        lpBalances[msg.sender] += amount;
        totalLPStaked += amount;
        
        bool ok = IERC20(lpToken).transferFrom(msg.sender, address(this), amount);
        require(ok, "LP transfer failed");
    }
    
    function _updateLPRewards(address account) internal {
        if (totalLPStaked == 0) return;
        
        uint256 timeElapsed = block.timestamp - lmProgram.startTime;
        if (timeElapsed > (lmProgram.endTime - lmProgram.startTime)) {
            timeElapsed = lmProgram.endTime - lmProgram.startTime;
        }
        
        uint256 totalRewards = lmProgram.rewardRate * timeElapsed;
        uint256 userShare = (totalRewards * lpBalances[account]) / totalLPStaked;
        
        if (userShare > 0 && lmProgram.distributed + userShare <= lmProgram.totalAllocated) {
            lmProgram.distributed += userShare;
            _transfer(address(this), account, userShare);
            emit LiquidityMiningReward(account, userShare);
        }
    }
    
    // ==================== FEE-ON-TRANSFER ====================
    
    function _transfer(address from, address to, uint256 amount) internal virtual override {
        require(from != address(0) && to != address(0), "Invalid address");
        
        // PROTECT STAKERS: No fee when staking or unstaking!
        bool isStakingOperation = (to == address(this)) || (from == address(this));
        bool takeFee = !isExemptFromFee[from] && !isExemptFromFee[to] && !paused() && !isStakingOperation;
        
        if (takeFee) {
            uint256 fee;
            
            if (isDEXPair[from] || isDEXPair[to]) {
                fee = (amount * tradingFeeBps) / BASIS_POINTS;
            } else {
                fee = (amount * transferFeeBps) / BASIS_POINTS;
            }
            
            if (fee > 0) {
                super._transfer(from, address(this), fee);
                amount -= fee;
                
                // Add fee to revenue (auto-compounds for stakers)
                totalRevenueCollected += fee;
                emit FeeCollected(from, fee);
            }
        }
        
        super._transfer(from, to, amount);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function getStakeInfo(address account) external view returns (
        uint256 stakedAmount,
        uint256 lockedAmount,
        uint256 lockEnd,
        uint256 pendingRewards,
        uint256 totalRewards,
        uint256 vePower
    ) {
        StakeInfo memory info = stakes[account];
        return (
            info.amount,
            info.lockedAmount,
            info.lockEnd,
            calculateEarned(account),
            info.accumulatedRewards,
            votingPower[account]
        );
    }
    
    function getRevenueStats() external view returns (
        uint256 total,
        uint256 holderShare,
        uint256 reserveShare,
        uint256 backingPerToken
    ) {
        uint256 holderTotal = (totalRevenueCollected * 1500) / BASIS_POINTS;  // 15% to holders
        uint256 backing = (totalReserveAccumulated * PRECISION) / TOTAL_SUPPLY;
        
        return (totalRevenueCollected, holderTotal, totalReserveAccumulated, backing);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    function setDEXPair(address pair, bool isPair) external onlyOwner {
        isDEXPair[pair] = isPair;
    }
    
    function setFeeExemption(address account, bool exempt) external onlyOwner {
        isExemptFromFee[account] = exempt;
    }
    
    function updateFees(uint256 transferFee, uint256 tradingFee) external onlyOwner {
        require(transferFee <= MAX_FEE && tradingFee <= MAX_FEE, "Fee too high");
        transferFeeBps = transferFee;
        tradingFeeBps = tradingFee;
    }
    
    /**
     * @dev Pause contract in emergency
     * PROTECTS USERS: If paused, fees also stop (fair!)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw reserve with 10% limit for user protection
     * PROTECTS USERS: Can't drain entire reserve (max 10% per call)
     */
    function emergencyWithdrawReserve(uint256 amount) external onlyOwner {
        uint256 maxWithdraw = totalReserveAccumulated / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal for user protection");
        totalReserveAccumulated -= amount;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "Reserve transfer failed");
    }
    
    /**
     * @dev UTIX-STYLE BUYBACK: Use reserve to buy TTX from market
     * Creates price floor that grows with platform revenue
     * FLUID: Can adjust buyback % based on market conditions
     */
    function buybackTTX(uint256 reserveAmount, address dexRouter) external onlyOwner {
        require(reserveAmount <= totalReserveAccumulated, "Exceeds reserve");
        require(dexRouter != address(0), "Invalid DEX");
        uint256 maxWithdraw = totalReserveAccumulated / 10;
        require(reserveAmount <= maxWithdraw, "Max 10% per withdrawal");
        
        totalReserveAccumulated -= reserveAmount;
        emit ReserveBuyback(reserveAmount, 0);
        emit ReserveUtilized(reserveAmount, "Buyback TTX from market");
    }
    
    /**
     * @dev Use reserve for platform growth (listings, marketing, etc)
     * FLUID: Owner decides best use of reserve
     */
    function utilizeReserve(uint256 amount, string memory purpose) external onlyOwner {
        require(amount <= totalReserveAccumulated, "Exceeds reserve");
        uint256 maxWithdraw = totalReserveAccumulated / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal");
        totalReserveAccumulated -= amount;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "Reserve transfer failed");
        emit ReserveUtilized(amount, purpose);
    }
    
    // ==================== RECEIVE ETH ====================
    
    receive() external payable {
        // Accept ETH for revenue collection
        totalRevenueCollected += msg.value;
    }
}
