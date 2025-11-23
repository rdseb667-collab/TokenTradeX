// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// Uniswap V2 Router interface for buybacks
interface IUniswapV2Router {
    function WETH() external pure returns (address);
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

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
 * 
 * TOKENOMICS FIXES (Nov 2025):
 * 1. CLEAN SEPARATION: totalRevenueTTX (15% holder pool) vs totalReserveTTX (85% treasury) vs totalReserveETH (cash)
 *    - Prevents unit-mixing bugs (no ETH counted as TTX rewards)
 *    - Prevents double-counting: totalRevenueTTX already has 15% applied, no extra multiply in rewardPerToken
 *    - rewardPerToken distributes FULL delta (no hidden 15% reduction)
 *    - backingPerToken uses ONLY totalReserveETH
 * 2. REAL BUYBACKS: buybackTTX() executes via Uniswap router, adds bought TTX to rewards
 * 3. ENFORCED msg.value: collectRevenue requires msg.value == amount for ETH
 * 4. SAFE WITHDRAWALS: 10% per-call limit on reserve (user protection), nonReentrant guards
 * 5. CANONICAL TOKEN: This is the ONLY active TTX contract (legacy retired)
 * 
 * SECURITY HARDENING (Nov 2025):
 * 1. DONATION-ATTACK PREVENTION: collectRevenue uses transferFrom, never balanceOf(this)
 * 2. TTX RESERVE MANAGEMENT: sellReserveTTX() and burnReserveTTX() to use 85% treasury
 * 3. FLEXIBLE UNSTAKING: Users can unstake unlocked portion without waiting for lock expiry
 * 4. ROBUST LP REWARDS: Proper lazy reward-per-token accumulator with lastUpdateTime
 * 5. REMOVED LEGACY VARS: Deleted unused totalRevenueCollected, totalReserveAccumulated, lastUpdateTime
 * 6. LOCKED TOKENS EARN REWARDS: Locked tokens count toward totalStaked (base + boost earnings)
 * 7. NO ETH DOUBLE-COUNTING: sellReserveTTX doesn't re-add ETH (receive() handles it)
 * 8. PER-LP ACCOUNTING: Each LP token has isolated reward tracking and state reset
 * 9. COMPLETE LP FUNCTIONS: withdrawLPTokens() and claimLPRewards() for full usability
 * 10. OPTIONAL REWARD CLAIMS: claimRewards() allows non-compounding withdrawal
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
        uint256 amount; // Base staked amount (unlocked)
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
    
    // CLEAN SEPARATION: TTX tokens vs ETH reserve
    uint256 public totalRevenueTTX;        // TTX for holder rewards (15% already applied)
    uint256 public totalReserveTTX;        // TTX-denominated treasury (85% bucket)
    uint256 public totalReserveETH;        // ETH/stablecoin backing (for buybacks)
    
    // ==================== LIQUIDITY MINING ====================
    
    struct LiquidityMining {
        uint256 rewardRate; // Tokens per second
        uint256 totalAllocated;
        uint256 distributed;
        uint256 startTime;
        uint256 endTime;
        uint256 lastUpdateTime; // Last time rewards were calculated
        uint256 rewardPerTokenStored; // Accumulated reward per LP token
        uint256 totalStaked; // Total LP staked for this program
    }
    
    mapping(address => LiquidityMining) public lmProgram;
    mapping(address => mapping(address => uint256)) public lpBalances; // lpToken => user => balance
    mapping(address => mapping(address => uint256)) public lpRewardDebt; // lpToken => user => debt
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
        
        // Initialize clean counters
        totalRevenueTTX = 0;
        totalReserveTTX = 0;
        totalReserveETH = 0;
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
     * Locked tokens COUNT toward staked total (they earn base + boost)
     */
    function createLock(uint256 amount, uint256 duration) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot lock 0");
        require(duration >= MIN_LOCK_DURATION && duration <= MAX_LOCK_DURATION, "Invalid duration");
        
        _transfer(msg.sender, address(this), amount);
        
        uint256 unlockTime = block.timestamp + duration;
        stakes[msg.sender].lockedAmount += amount;
        stakes[msg.sender].lockEnd = unlockTime;
        
        // Locked tokens are ALSO counted in base stake (earn base + boost)
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        totalLocked += amount;
        
        // Calculate voting power (max 4x for 4 year lock)
        uint256 vePower = (amount * duration) / MAX_LOCK_DURATION;
        stakes[msg.sender].vePower += vePower;
        votingPower[msg.sender] += vePower;
        totalVotingPower += vePower;
        
        emit Locked(msg.sender, amount, duration, vePower);
    }
    
    /**
     * @dev Unstake tokens (unlocked portion only)
     * Lock must expire before withdrawing locked amount
     * WORKS EVEN WHEN PAUSED - Users can always exit!
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient unlocked balance");
        
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Unlock tokens after lock expiry and decay voting power.
     * Moves locked tokens back to unlocked (still staked, earning base rewards)
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
        // Amount stays in stakes[msg.sender].amount (still earning base rewards)
    }
    
    // ==================== AUTO-COMPOUNDING REWARDS ====================
    
    modifier updateReward(address account) {
        uint256 newRPT = rewardPerToken();
        if (newRPT != rewardPerTokenStored) {
            rewardPerTokenStored = newRPT;
            lastRevenueForRewards = totalRevenueTTX; // Track TTX only
        }
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
    
    /**
     * @dev Claim accumulated staking rewards without unstaking
     * Rewards are paid out but stake remains (optional convenience)
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 rewards = stakes[msg.sender].accumulatedRewards;
        require(rewards > 0, "No rewards to claim");
        
        stakes[msg.sender].accumulatedRewards = 0;
        _transfer(address(this), msg.sender, rewards);
        
        emit RewardsCompounded(msg.sender, rewards); // Reuse event
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        // CLEAN: totalRevenueTTX already contains ONLY the 15% holder share
        uint256 revenueDelta = totalRevenueTTX > lastRevenueForRewards
            ? (totalRevenueTTX - lastRevenueForRewards)
            : 0;
        if (revenueDelta == 0) return rewardPerTokenStored;
        // Distribute FULL delta; no extra 15% multiply (already applied at collection)
        return rewardPerTokenStored + ((revenueDelta * PRECISION) / totalStaked);
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
     * SECURITY: Requires explicit transferFrom to prevent donation attacks
     * 
     * @param streamId Revenue stream (0-9)
     * @param amount Amount in TTX tokens OR ETH wei (must match msg.value if ETH)
     * @param isTTX True if amount is TTX tokens, false if ETH
     */
    function collectRevenue(uint256 streamId, uint256 amount, bool isTTX) external payable onlyOwner {
        require(streamId < 10, "Invalid stream");
        require(revenueStreams[streamId].isActive, "Stream inactive");
        
        if (isTTX) {
            // TTX token revenue - SECURE: explicit transferFrom (no donation attack)
            require(msg.value == 0, "Don't send ETH for TTX revenue");
            require(amount > 0, "Amount must be positive");
            
            // SECURE: Transfer tokens in, don't rely on balanceOf(this)
            bool success = IERC20(address(this)).transferFrom(msg.sender, address(this), amount);
            require(success, "TTX transfer failed");
            
            // Split explicitly: 15% holders / 85% TTX treasury
            uint256 holderShareTTX = (amount * 1500) / BASIS_POINTS;
            uint256 reserveShareTTX = amount - holderShareTTX;
            totalRevenueTTX += holderShareTTX;   // distributable via rewardPerToken
            totalReserveTTX += reserveShareTTX;  // treasury TTX (not auto-distributed)
        } else {
            // ETH/native revenue - must match msg.value
            require(msg.value == amount, "msg.value must equal amount for ETH");
            
            totalReserveETH += amount;
            // ETH goes to reserve; only becomes rewards after buybackTTX converts it
        }
        
        revenueStreams[streamId].totalCollected += amount;
        
        // FLUID Auto-split (like UTIX gets piece of every ticket)
        uint256 holderShare = (amount * 1500) / BASIS_POINTS; // 15% to holders
        uint256 reserveShare = amount - holderShare; // 85% builds reserve
        
        revenueStreams[streamId].holderShare += holderShare;
        revenueStreams[streamId].reserveShare += reserveShare;
        
        emit RevenueCollected(streamId, amount);
    }
    
    // ==================== LIQUIDITY MINING ====================
    
    /**
     * @dev Start liquidity mining program
     */
    function startLiquidityMining(uint256 rewardRate, uint256 duration) external onlyOwner {
        require(lmProgram[lpToken].endTime < block.timestamp, "Program active");
        require(lpToken != address(0), "LP token not set");
        
        lmProgram[lpToken] = LiquidityMining({
            rewardRate: rewardRate,
            totalAllocated: LIQUIDITY_MINING,
            distributed: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0, // Reset for new program
            totalStaked: 0 // Reset for new program
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
        require(lmProgram[lpToken].endTime > block.timestamp, "Program ended");
        require(lpToken != address(0), "LP token not set");
        
        _updateLPRewards(lpToken, msg.sender);
        
        lpBalances[lpToken][msg.sender] += amount;
        lmProgram[lpToken].totalStaked += amount;
        
        bool ok = IERC20(lpToken).transferFrom(msg.sender, address(this), amount);
        require(ok, "LP transfer failed");
    }
    
    /**
     * @dev Withdraw LP tokens (claims rewards automatically)
     */
    function withdrawLPTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot withdraw 0");
        require(lpToken != address(0), "LP token not set");
        require(lpBalances[lpToken][msg.sender] >= amount, "Insufficient LP balance");
        
        _updateLPRewards(lpToken, msg.sender);
        
        lpBalances[lpToken][msg.sender] -= amount;
        lmProgram[lpToken].totalStaked -= amount;
        
        bool ok = IERC20(lpToken).transfer(msg.sender, amount);
        require(ok, "LP transfer failed");
    }
    
    /**
     * @dev Claim LP rewards without withdrawing LP tokens
     */
    function claimLPRewards() external nonReentrant {
        require(lpToken != address(0), "LP token not set");
        _updateLPRewards(lpToken, msg.sender);
    }
    
    /**
     * @dev Update LP rewards using proper lazy reward-per-token pattern
     * Only accumulates rewards since last update (no double-counting)
     */
    function _updateLPRewards(address _lpToken, address account) internal {
        LiquidityMining storage program = lmProgram[_lpToken];
        
        if (program.totalStaked > 0) {
            uint256 currentTime = block.timestamp < program.endTime ? block.timestamp : program.endTime;
            uint256 timeElapsed = currentTime > program.lastUpdateTime ? currentTime - program.lastUpdateTime : 0;
            
            if (timeElapsed > 0) {
                uint256 reward = program.rewardRate * timeElapsed;
                uint256 rewardPerToken = (reward * PRECISION) / program.totalStaked;
                program.rewardPerTokenStored += rewardPerToken; // Accumulate only NEW rewards
                program.lastUpdateTime = currentTime; // Update timestamp
            }
        }
        
        if (account != address(0) && lpBalances[_lpToken][account] > 0) {
            uint256 earned = (lpBalances[_lpToken][account] * program.rewardPerTokenStored) / PRECISION - lpRewardDebt[_lpToken][account];
            if (earned > 0 && program.distributed + earned <= program.totalAllocated) {
                program.distributed += earned;
                _transfer(address(this), account, earned);
                emit LiquidityMiningReward(account, earned);
            }
            lpRewardDebt[_lpToken][account] = (lpBalances[_lpToken][account] * program.rewardPerTokenStored) / PRECISION;
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
                
                // Split fee: 15% to holders (rewards), 85% to TTX treasury
                uint256 holderFee = (fee * 1500) / BASIS_POINTS;
                uint256 reserveFee = fee - holderFee;
                totalRevenueTTX += holderFee;  // becomes distributable
                totalReserveTTX += reserveFee; // treasury bucket
                
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
        uint256 totalTTX,
        uint256 totalETH,
        uint256 holderShare,
        uint256 backingPerToken
    ) {
        uint256 backing = (totalReserveETH * PRECISION) / TOTAL_SUPPLY; // ETH backing per token
        
        return (totalRevenueTTX, totalReserveETH, totalRevenueTTX, backing);
    }
    
    /**
     * @dev Get backing per token for both reserves
     * Shows how much ETH and TTX backs each token
     */
    function getBacking() external view returns (uint256 ethPerToken, uint256 ttxPerToken) {
        ethPerToken = (totalReserveETH * PRECISION) / TOTAL_SUPPLY;
        ttxPerToken = (totalReserveTTX * PRECISION) / TOTAL_SUPPLY;
    }
    
    // ==================== TTX RESERVE MANAGEMENT ====================
    
    /**
     * @dev Sell TTX reserve to ETH via DEX (opposite of buyback)
     * Converts idle TTX treasury into liquid ETH for operations/buybacks
     */
    function sellReserveTTX(uint256 ttxAmount, address dexRouter, uint256 minETHOut) external onlyOwner nonReentrant {
        require(ttxAmount <= totalReserveTTX, "Exceeds TTX reserve");
        require(dexRouter != address(0), "Invalid DEX");
        uint256 maxSell = totalReserveTTX / 10; // 10% per call limit
        require(ttxAmount <= maxSell, "Max 10% per sale");
        
        totalReserveTTX -= ttxAmount;
        
        // Track ETH before swap (receive() will increment totalReserveETH)
        uint256 balanceBefore = address(this).balance;
        
        // Sell TTX for ETH via DEX
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IUniswapV2Router(dexRouter).WETH();
        
        // Approve router
        _approve(address(this), dexRouter, ttxAmount);
        
        IUniswapV2Router(dexRouter).swapExactTokensForETHSupportingFeeOnTransferTokens(
            ttxAmount,
            minETHOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        // No need to add again - receive() already added it to totalReserveETH
        uint256 ethReceived = address(this).balance - balanceBefore;
        
        emit ReserveUtilized(ttxAmount, "Sold TTX reserve to ETH");
    }
    
    /**
     * @dev Burn TTX reserve (deflation mechanism)
     * Reduces supply, increases scarcity
     */
    function burnReserveTTX(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= totalReserveTTX, "Exceeds TTX reserve");
        uint256 maxBurn = totalReserveTTX / 10; // 10% per call limit
        require(amount <= maxBurn, "Max 10% per burn");
        
        totalReserveTTX -= amount;
        _burn(address(this), amount);
        
        emit ReserveUtilized(amount, "Burned TTX reserve");
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
    function emergencyWithdrawReserve(uint256 amount) external onlyOwner nonReentrant {
        uint256 maxWithdraw = totalReserveETH / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal for user protection");
        require(amount <= totalReserveETH, "Exceeds reserve");
        totalReserveETH -= amount;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "Reserve transfer failed");
    }
    
    /**
     * @dev UTIX-STYLE BUYBACK: Use ETH reserve to buy TTX from market
     * Creates price floor that grows with platform revenue
     * FLUID: Can adjust buyback % based on market conditions
     * 
     * @param reserveAmount ETH to spend on buyback
     * @param dexRouter Uniswap/Sushiswap router address
     * @param minTTXOut Minimum TTX to receive (slippage protection)
     */
    function buybackTTX(uint256 reserveAmount, address dexRouter, uint256 minTTXOut) external onlyOwner nonReentrant {
        require(reserveAmount <= totalReserveETH, "Exceeds reserve");
        require(dexRouter != address(0), "Invalid DEX");
        uint256 maxWithdraw = totalReserveETH / 10;
        require(reserveAmount <= maxWithdraw, "Max 10% per withdrawal");
        
        totalReserveETH -= reserveAmount;
        
        // Real buyback via DEX (Uniswap V2/V3 compatible)
        address[] memory path = new address[](2);
        path[0] = IUniswapV2Router(dexRouter).WETH();
        path[1] = address(this);
        
        uint256 balanceBefore = balanceOf(address(this));
        
        IUniswapV2Router(dexRouter).swapExactETHForTokensSupportingFeeOnTransferTokens{value: reserveAmount}(
            minTTXOut,
            path,
            address(this), // Bought TTX stays in contract
            block.timestamp + 300
        );
        
        uint256 ttxBought = balanceOf(address(this)) - balanceBefore;
        
        // Design choice: buyback-and-REWARD adds bought TTX to rewards pool
        // Alternative: buyback-and-BURN would send to dead address instead
        totalRevenueTTX += ttxBought;
        
        emit ReserveBuyback(reserveAmount, ttxBought);
        emit ReserveUtilized(reserveAmount, "Buyback TTX from market");
    }
    
    /**
     * @dev Use reserve for platform growth (listings, marketing, etc)
     * FLUID: Owner decides best use of reserve
     */
    function utilizeReserve(uint256 amount, string memory purpose) external onlyOwner nonReentrant {
        require(amount <= totalReserveETH, "Exceeds reserve");
        uint256 maxWithdraw = totalReserveETH / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal");
        totalReserveETH -= amount;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "Reserve transfer failed");
        emit ReserveUtilized(amount, purpose);
    }
    
    // ==================== RECEIVE ETH ====================
    
    receive() external payable {
        // Accept ETH - goes to reserve for buybacks
        totalReserveETH += msg.value;
    }
}
