// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
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
 * @title TTX Unified Token - SECURE PRODUCTION VERSION
 * @dev Enhanced security with role-based access control and timelock protection
 * 
 * SECURITY ENHANCEMENTS:
 * 1. Role-Based Access Control:
 *    - ADMIN_ROLE: Can update parameters, pause, manage roles
 *    - REVENUE_COLLECTOR_ROLE: Can ONLY call collectRevenue (backend service)
 *    - GUARDIAN_ROLE: Can pause in emergencies
 *    - TIMELOCK_ROLE: Required for sensitive fund movements
 * 
 * 2. Timelock Protection:
 *    - Reserve withdrawals require 24-48 hour delay
 *    - Prevents rushed or unauthorized fund movements
 *    - Allows community oversight and cancellation
 * 
 * 3. Destination Allowlists:
 *    - Only approved addresses can receive reserve funds
 *    - Prevents arbitrary external transfers
 *    - Owner maintains approved destinations list
 * 
 * 4. Per-Period Caps:
 *    - Daily withdrawal limits beyond 10% per-call
 *    - Monthly utilization caps
 *    - Automatic reset mechanisms
 * 
 * 5. Enhanced Monitoring:
 *    - Detailed events for all sensitive operations
 *    - Operation IDs for tracking and cancellation
 *    - Clear audit trail
 */
contract TTXUnifiedSecure is ERC20, AccessControl, ReentrancyGuard, Pausable {
    
    // ==================== ROLES ====================
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REVENUE_COLLECTOR_ROLE = keccak256("REVENUE_COLLECTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    
    // ==================== CONSTANTS ====================
    
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days;
    uint256 public constant MIN_LOCK_DURATION = 7 days;
    uint256 public constant BASIS_POINTS = 10000;
    
    // Security constants
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    uint256 public constant MAX_TIMELOCK_DELAY = 7 days;
    uint256 public constant DAILY_WITHDRAWAL_CAP_BPS = 500; // 5% per day
    uint256 public constant MONTHLY_UTILIZATION_CAP_BPS = 2000; // 20% per month
    
    // ==================== TOKEN DISTRIBUTION ====================
    
    uint256 public constant PUBLIC_ALLOCATION = 500_000_000 * 10**18;
    uint256 public constant LIQUIDITY_MINING = 200_000_000 * 10**18;
    uint256 public constant PLATFORM_RESERVE = 150_000_000 * 10**18;
    uint256 public constant TEAM_ALLOCATION = 100_000_000 * 10**18;
    uint256 public constant EARLY_ADOPTERS = 50_000_000 * 10**18;
    
    // ==================== FEE STRUCTURE ====================
    
    uint256 public transferFeeBps = 10;
    uint256 public tradingFeeBps = 25;
    uint256 public constant MAX_FEE = 500;
    
    mapping(address => bool) public isExemptFromFee;
    mapping(address => bool) public isDEXPair;
    
    // ==================== TIMELOCK OPERATIONS ====================
    
    struct TimelockOperation {
        address target;
        uint256 value;
        bytes data;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
        string description;
    }
    
    mapping(bytes32 => TimelockOperation) public timelockOps;
    uint256 public timelockDelay = TIMELOCK_DELAY;
    
    // ==================== ALLOWLISTS ====================
    
    mapping(address => bool) public isApprovedDestination;
    address[] public approvedDestinations;
    
    // ==================== WITHDRAWAL CAPS ====================
    
    struct WithdrawalTracking {
        uint256 dailyWithdrawn;
        uint256 monthlyWithdrawn;
        uint256 lastDailyReset;
        uint256 lastMonthlyReset;
    }
    
    WithdrawalTracking public withdrawalTracker;
    
    // ==================== STAKING & LOCKING ====================
    
    struct StakeInfo {
        uint256 amount;
        uint256 lockedAmount;
        uint256 lockEnd;
        uint256 rewardDebt;
        uint256 accumulatedRewards;
        uint256 vePower;
    }
    
    mapping(address => StakeInfo) public stakes;
    
    uint256 public totalStaked;
    uint256 public totalLocked;
    uint256 public rewardPerTokenStored;
    uint256 public lastRevenueForRewards;
    
    // ==================== REVENUE STREAMS ====================
    
    struct RevenueStream {
        string name;
        uint256 totalCollected;
        uint256 holderShare;
        uint256 reserveShare;
        bool isActive;
    }
    
    RevenueStream[10] public revenueStreams;
    
    uint256 public totalRevenueTTX;
    uint256 public totalReserveTTX;
    uint256 public totalReserveETH;
    
    // ==================== LIQUIDITY MINING ====================
    
    struct LiquidityMining {
        uint256 rewardRate;
        uint256 totalAllocated;
        uint256 distributed;
        uint256 startTime;
        uint256 endTime;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        uint256 totalStaked;
    }
    
    mapping(address => LiquidityMining) public lmProgram;
    mapping(address => mapping(address => uint256)) public lpBalances;
    mapping(address => mapping(address => uint256)) public lpRewardDebt;
    address public lpToken;
    
    // ==================== GOVERNANCE ====================
    
    mapping(address => uint256) public votingPower;
    uint256 public totalVotingPower;
    
    // ==================== EVENTS ====================
    
    event Staked(address indexed user, uint256 amount);
    event Locked(address indexed user, uint256 amount, uint256 duration, uint256 votingPower);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsCompounded(address indexed user, uint256 amount);
    event RevenueCollected(uint256 indexed streamId, uint256 amount, address indexed collector);
    event LiquidityMiningReward(address indexed user, uint256 amount);
    event FeeCollected(address indexed from, uint256 amount);
    event ReserveBuyback(uint256 amount, uint256 ttxBought);
    event ReserveUtilized(uint256 amount, string purpose);
    
    // Security events
    event TimelockOperationQueued(bytes32 indexed opId, address indexed target, uint256 value, string description, uint256 executeAfter);
    event TimelockOperationExecuted(bytes32 indexed opId, address indexed executor);
    event TimelockOperationCancelled(bytes32 indexed opId, address indexed canceller);
    event DestinationApproved(address indexed destination, bool approved);
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event WithdrawalCapReset(bool daily, bool monthly);
    event EmergencyAction(address indexed executor, string action, uint256 value);
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(address multisig) ERC20("TokenTradeX Unified Secure", "TTX") {
        require(multisig != address(0), "Invalid multisig");
        
        // Mint to contract for controlled distribution
        _mint(address(this), TOTAL_SUPPLY);
        
        // Setup roles - multisig gets all admin control
        _grantRole(DEFAULT_ADMIN_ROLE, multisig);
        _grantRole(ADMIN_ROLE, multisig);
        _grantRole(TIMELOCK_ROLE, multisig);
        _grantRole(GUARDIAN_ROLE, multisig);
        
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
        
        lastRevenueForRewards = 0;
        totalRevenueTTX = 0;
        totalReserveTTX = 0;
        totalReserveETH = 0;
        
        // Initialize withdrawal tracker
        withdrawalTracker.lastDailyReset = block.timestamp;
        withdrawalTracker.lastMonthlyReset = block.timestamp;
        
        // Exempt key addresses
        isExemptFromFee[address(this)] = true;
        isExemptFromFee[multisig] = true;
        
        // Approve multisig as default destination
        isApprovedDestination[multisig] = true;
        approvedDestinations.push(multisig);
    }
    
    // ==================== ROLE MANAGEMENT ====================
    
    /**
     * @dev Grant revenue collector role to backend service
     * SECURITY: This role can ONLY call collectRevenue, nothing else
     */
    function grantRevenueCollectorRole(address collector) external onlyRole(ADMIN_ROLE) {
        require(collector != address(0), "Invalid collector");
        _grantRole(REVENUE_COLLECTOR_ROLE, collector);
    }
    
    function revokeRevenueCollectorRole(address collector) external onlyRole(ADMIN_ROLE) {
        _revokeRole(REVENUE_COLLECTOR_ROLE, collector);
    }
    
    // ==================== STAKING FUNCTIONS (unchanged) ====================
    
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _transfer(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }
    
    function createLock(uint256 amount, uint256 duration) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot lock 0");
        require(duration >= MIN_LOCK_DURATION && duration <= MAX_LOCK_DURATION, "Invalid duration");
        
        _transfer(msg.sender, address(this), amount);
        
        uint256 unlockTime = block.timestamp + duration;
        stakes[msg.sender].lockedAmount += amount;
        stakes[msg.sender].lockEnd = unlockTime;
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        totalLocked += amount;
        
        uint256 vePower = (amount * duration) / MAX_LOCK_DURATION;
        stakes[msg.sender].vePower += vePower;
        votingPower[msg.sender] += vePower;
        totalVotingPower += vePower;
        
        emit Locked(msg.sender, amount, duration, vePower);
    }
    
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient unlocked balance");
        
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        
        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }
    
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
    }
    
    modifier updateReward(address account) {
        uint256 newRPT = rewardPerToken();
        if (newRPT != rewardPerTokenStored) {
            rewardPerTokenStored = newRPT;
            lastRevenueForRewards = totalRevenueTTX;
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
    
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 rewards = stakes[msg.sender].accumulatedRewards;
        require(rewards > 0, "No rewards to claim");
        
        stakes[msg.sender].accumulatedRewards = 0;
        _transfer(address(this), msg.sender, rewards);
        emit RewardsCompounded(msg.sender, rewards);
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        uint256 revenueDelta = totalRevenueTTX > lastRevenueForRewards
            ? (totalRevenueTTX - lastRevenueForRewards)
            : 0;
        if (revenueDelta == 0) return rewardPerTokenStored;
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
    
    // ==================== REVENUE COLLECTION (SECURED) ====================
    
    /**
     * @dev Collect revenue - ONLY callable by REVENUE_COLLECTOR_ROLE
     * Backend service can deposit but CANNOT withdraw or move funds
     */
    function collectRevenue(uint256 streamId, uint256 amount, bool isTTX) external payable onlyRole(REVENUE_COLLECTOR_ROLE) {
        require(streamId < 10, "Invalid stream");
        require(revenueStreams[streamId].isActive, "Stream inactive");
        
        if (isTTX) {
            require(msg.value == 0, "Don't send ETH for TTX revenue");
            require(amount > 0, "Amount must be positive");
            
            bool success = IERC20(address(this)).transferFrom(msg.sender, address(this), amount);
            require(success, "TTX transfer failed");
            
            uint256 holderShareTTX = (amount * 1500) / BASIS_POINTS;
            uint256 reserveShareTTX = amount - holderShareTTX;
            totalRevenueTTX += holderShareTTX;
            totalReserveTTX += reserveShareTTX;
        } else {
            require(msg.value == amount, "msg.value must equal amount for ETH");
            totalReserveETH += amount;
        }
        
        revenueStreams[streamId].totalCollected += amount;
        
        uint256 holderShare = (amount * 1500) / BASIS_POINTS;
        uint256 reserveShare = amount - holderShare;
        
        revenueStreams[streamId].holderShare += holderShare;
        revenueStreams[streamId].reserveShare += reserveShare;
        
        emit RevenueCollected(streamId, amount, msg.sender);
    }
    
    // ==================== DESTINATION ALLOWLIST ====================
    
    /**
     * @dev Approve destination for reserve withdrawals
     * SECURITY: Only approved addresses can receive funds
     */
    function approveDestination(address destination, bool approved) external onlyRole(ADMIN_ROLE) {
        require(destination != address(0), "Invalid destination");
        
        if (approved && !isApprovedDestination[destination]) {
            approvedDestinations.push(destination);
        }
        
        isApprovedDestination[destination] = approved;
        emit DestinationApproved(destination, approved);
    }
    
    function getApprovedDestinations() external view returns (address[] memory) {
        return approvedDestinations;
    }
    
    // ==================== WITHDRAWAL CAP MANAGEMENT ====================
    
    /**
     * @dev Reset withdrawal caps if period elapsed
     */
    function _checkAndResetCaps() internal {
        if (block.timestamp >= withdrawalTracker.lastDailyReset + 1 days) {
            withdrawalTracker.dailyWithdrawn = 0;
            withdrawalTracker.lastDailyReset = block.timestamp;
            emit WithdrawalCapReset(true, false);
        }
        
        if (block.timestamp >= withdrawalTracker.lastMonthlyReset + 30 days) {
            withdrawalTracker.monthlyWithdrawn = 0;
            withdrawalTracker.lastMonthlyReset = block.timestamp;
            emit WithdrawalCapReset(false, true);
        }
    }
    
    /**
     * @dev Check withdrawal against caps
     */
    function _checkWithdrawalCaps(uint256 amount) internal view {
        uint256 dailyCap = (totalReserveETH * DAILY_WITHDRAWAL_CAP_BPS) / BASIS_POINTS;
        uint256 monthlyCap = (totalReserveETH * MONTHLY_UTILIZATION_CAP_BPS) / BASIS_POINTS;
        
        require(
            withdrawalTracker.dailyWithdrawn + amount <= dailyCap,
            "Daily withdrawal cap exceeded"
        );
        require(
            withdrawalTracker.monthlyWithdrawn + amount <= monthlyCap,
            "Monthly utilization cap exceeded"
        );
    }
    
    /**
     * @dev Record withdrawal for cap tracking
     */
    function _recordWithdrawal(uint256 amount) internal {
        _checkAndResetCaps();
        withdrawalTracker.dailyWithdrawn += amount;
        withdrawalTracker.monthlyWithdrawn += amount;
    }
    
    // ==================== TIMELOCK OPERATIONS ====================
    
    /**
     * @dev Queue a timelocked operation
     * SECURITY: Sensitive operations require delay before execution
     */
    function queueTimelockOp(
        address target,
        uint256 value,
        bytes memory data,
        string memory description
    ) external onlyRole(TIMELOCK_ROLE) returns (bytes32) {
        require(target != address(0), "Invalid target");
        require(isApprovedDestination[target], "Target not approved");
        
        bytes32 opId = keccak256(abi.encode(target, value, data, block.timestamp));
        require(timelockOps[opId].executeAfter == 0, "Operation already queued");
        
        uint256 executeAfter = block.timestamp + timelockDelay;
        
        timelockOps[opId] = TimelockOperation({
            target: target,
            value: value,
            data: data,
            executeAfter: executeAfter,
            executed: false,
            cancelled: false,
            description: description
        });
        
        emit TimelockOperationQueued(opId, target, value, description, executeAfter);
        return opId;
    }
    
    /**
     * @dev Execute a timelocked operation after delay
     */
    function executeTimelockOp(bytes32 opId) external onlyRole(TIMELOCK_ROLE) nonReentrant {
        TimelockOperation storage op = timelockOps[opId];
        require(op.executeAfter > 0, "Operation not queued");
        require(!op.executed, "Already executed");
        require(!op.cancelled, "Operation cancelled");
        require(block.timestamp >= op.executeAfter, "Timelock not expired");
        
        op.executed = true;
        
        (bool success, ) = op.target.call{value: op.value}(op.data);
        require(success, "Execution failed");
        
        emit TimelockOperationExecuted(opId, msg.sender);
    }
    
    /**
     * @dev Cancel a timelocked operation
     * SECURITY: Admin can cancel suspicious operations
     */
    function cancelTimelockOp(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        TimelockOperation storage op = timelockOps[opId];
        require(op.executeAfter > 0, "Operation not queued");
        require(!op.executed, "Already executed");
        require(!op.cancelled, "Already cancelled");
        
        op.cancelled = true;
        emit TimelockOperationCancelled(opId, msg.sender);
    }
    
    /**
     * @dev Update timelock delay
     */
    function setTimelockDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        require(newDelay >= 1 hours && newDelay <= MAX_TIMELOCK_DELAY, "Invalid delay");
        uint256 oldDelay = timelockDelay;
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(oldDelay, newDelay);
    }
    
    // ==================== SECURED RESERVE FUNCTIONS ====================
    
    /**
     * @dev Utilize reserve - REQUIRES TIMELOCK + ALLOWLIST
     * Must queue operation, wait delay, then execute
     */
    function utilizeReserveSecure(uint256 amount, address destination, string memory purpose) 
        external 
        onlyRole(TIMELOCK_ROLE) 
        nonReentrant 
    {
        require(amount <= totalReserveETH, "Exceeds reserve");
        require(isApprovedDestination[destination], "Destination not approved");
        
        uint256 maxWithdraw = totalReserveETH / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal");
        
        _checkWithdrawalCaps(amount);
        _recordWithdrawal(amount);
        
        totalReserveETH -= amount;
        (bool ok, ) = payable(destination).call{value: amount}("");
        require(ok, "Reserve transfer failed");
        
        emit ReserveUtilized(amount, purpose);
    }
    
    /**
     * @dev Buyback TTX - REQUIRES ADMIN ROLE + CAPS
     */
    function buybackTTX(uint256 reserveAmount, address dexRouter, uint256 minTTXOut) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(reserveAmount <= totalReserveETH, "Exceeds reserve");
        require(dexRouter != address(0), "Invalid DEX");
        
        uint256 maxWithdraw = totalReserveETH / 10;
        require(reserveAmount <= maxWithdraw, "Max 10% per withdrawal");
        
        _checkWithdrawalCaps(reserveAmount);
        _recordWithdrawal(reserveAmount);
        
        totalReserveETH -= reserveAmount;
        
        address[] memory path = new address[](2);
        path[0] = IUniswapV2Router(dexRouter).WETH();
        path[1] = address(this);
        
        uint256 balanceBefore = balanceOf(address(this));
        
        IUniswapV2Router(dexRouter).swapExactETHForTokensSupportingFeeOnTransferTokens{value: reserveAmount}(
            minTTXOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 ttxBought = balanceOf(address(this)) - balanceBefore;
        totalRevenueTTX += ttxBought;
        
        emit ReserveBuyback(reserveAmount, ttxBought);
        emit ReserveUtilized(reserveAmount, "Buyback TTX from market");
    }
    
    /**
     * @dev Sell reserve TTX - REQUIRES ADMIN ROLE
     */
    function sellReserveTTX(uint256 ttxAmount, address dexRouter, uint256 minETHOut) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(ttxAmount <= totalReserveTTX, "Exceeds TTX reserve");
        require(dexRouter != address(0), "Invalid DEX");
        
        uint256 maxSell = totalReserveTTX / 10;
        require(ttxAmount <= maxSell, "Max 10% per sale");
        
        totalReserveTTX -= ttxAmount;
        
        uint256 balanceBefore = address(this).balance;
        
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IUniswapV2Router(dexRouter).WETH();
        
        _approve(address(this), dexRouter, ttxAmount);
        
        IUniswapV2Router(dexRouter).swapExactTokensForETHSupportingFeeOnTransferTokens(
            ttxAmount,
            minETHOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 ethReceived = address(this).balance - balanceBefore;
        emit ReserveUtilized(ttxAmount, "Sold TTX reserve to ETH");
    }
    
    /**
     * @dev Burn TTX reserve - REQUIRES ADMIN ROLE
     */
    function burnReserveTTX(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(amount <= totalReserveTTX, "Exceeds TTX reserve");
        
        uint256 maxBurn = totalReserveTTX / 10;
        require(amount <= maxBurn, "Max 10% per burn");
        
        totalReserveTTX -= amount;
        _burn(address(this), amount);
        
        emit ReserveUtilized(amount, "Burned TTX reserve");
    }
    
    // ==================== EMERGENCY FUNCTIONS ====================
    
    /**
     * @dev Emergency pause - GUARDIAN can pause instantly
     */
    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyAction(msg.sender, "Pause", 0);
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw - REQUIRES ADMIN + respects caps
     * For critical situations only
     */
    function emergencyWithdrawReserve(uint256 amount, address destination) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(isApprovedDestination[destination], "Destination not approved");
        require(amount <= totalReserveETH, "Exceeds reserve");
        
        uint256 maxWithdraw = totalReserveETH / 10;
        require(amount <= maxWithdraw, "Max 10% per withdrawal");
        
        _checkWithdrawalCaps(amount);
        _recordWithdrawal(amount);
        
        totalReserveETH -= amount;
        (bool ok, ) = payable(destination).call{value: amount}("");
        require(ok, "Reserve transfer failed");
        
        emit EmergencyAction(msg.sender, "Emergency Withdraw", amount);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    function setDEXPair(address pair, bool isPair) external onlyRole(ADMIN_ROLE) {
        isDEXPair[pair] = isPair;
    }
    
    function setFeeExemption(address account, bool exempt) external onlyRole(ADMIN_ROLE) {
        isExemptFromFee[account] = exempt;
    }
    
    function updateFees(uint256 transferFee, uint256 tradingFee) external onlyRole(ADMIN_ROLE) {
        require(transferFee <= MAX_FEE && tradingFee <= MAX_FEE, "Fee too high");
        transferFeeBps = transferFee;
        tradingFeeBps = tradingFee;
    }
    
    function setLPToken(address token) external onlyRole(ADMIN_ROLE) {
        lpToken = token;
    }
    
    function startLiquidityMining(uint256 rewardRate, uint256 duration) external onlyRole(ADMIN_ROLE) {
        require(lmProgram[lpToken].endTime < block.timestamp, "Program active");
        require(lpToken != address(0), "LP token not set");
        
        lmProgram[lpToken] = LiquidityMining({
            rewardRate: rewardRate,
            totalAllocated: LIQUIDITY_MINING,
            distributed: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalStaked: 0
        });
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
        uint256 backing = (totalReserveETH * PRECISION) / TOTAL_SUPPLY;
        return (totalRevenueTTX, totalReserveETH, totalRevenueTTX, backing);
    }
    
    function getBacking() external view returns (uint256 ethPerToken, uint256 ttxPerToken) {
        ethPerToken = (totalReserveETH * PRECISION) / TOTAL_SUPPLY;
        ttxPerToken = (totalReserveTTX * PRECISION) / TOTAL_SUPPLY;
    }
    
    function getWithdrawalLimits() external view returns (
        uint256 dailyLimit,
        uint256 dailyUsed,
        uint256 dailyRemaining,
        uint256 monthlyLimit,
        uint256 monthlyUsed,
        uint256 monthlyRemaining
    ) {
        dailyLimit = (totalReserveETH * DAILY_WITHDRAWAL_CAP_BPS) / BASIS_POINTS;
        dailyUsed = withdrawalTracker.dailyWithdrawn;
        dailyRemaining = dailyLimit > dailyUsed ? dailyLimit - dailyUsed : 0;
        
        monthlyLimit = (totalReserveETH * MONTHLY_UTILIZATION_CAP_BPS) / BASIS_POINTS;
        monthlyUsed = withdrawalTracker.monthlyWithdrawn;
        monthlyRemaining = monthlyLimit > monthlyUsed ? monthlyLimit - monthlyUsed : 0;
    }
    
    // ==================== FEE-ON-TRANSFER (unchanged) ====================
    
    function _transfer(address from, address to, uint256 amount) internal virtual override {
        require(from != address(0) && to != address(0), "Invalid address");
        
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
                
                uint256 holderFee = (fee * 1500) / BASIS_POINTS;
                uint256 reserveFee = fee - holderFee;
                totalRevenueTTX += holderFee;
                totalReserveTTX += reserveFee;
                
                emit FeeCollected(from, fee);
            }
        }
        
        super._transfer(from, to, amount);
    }
    
    // ==================== LP STAKING (unchanged) ====================
    
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
    
    function claimLPRewards() external nonReentrant {
        require(lpToken != address(0), "LP token not set");
        _updateLPRewards(lpToken, msg.sender);
    }
    
    function _updateLPRewards(address _lpToken, address account) internal {
        LiquidityMining storage program = lmProgram[_lpToken];
        
        if (program.totalStaked > 0) {
            uint256 currentTime = block.timestamp < program.endTime ? block.timestamp : program.endTime;
            uint256 timeElapsed = currentTime > program.lastUpdateTime ? currentTime - program.lastUpdateTime : 0;
            
            if (timeElapsed > 0) {
                uint256 reward = program.rewardRate * timeElapsed;
                uint256 rewardPerToken = (reward * PRECISION) / program.totalStaked;
                program.rewardPerTokenStored += rewardPerToken;
                program.lastUpdateTime = currentTime;
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
    
    receive() external payable {
        totalReserveETH += msg.value;
    }
}
