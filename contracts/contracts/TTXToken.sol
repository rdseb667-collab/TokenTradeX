// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TTXToken - TokenTradeX Platform Token
 * @notice ERC20 token with built-in transaction fee mechanism
 * @dev Fees collected from every transfer go to designated pools
 * 
 * ⚠️ DEPRECATED - Nov 2025
 * This contract is RETIRED. Use TTXUnified.sol instead.
 * Reason: Conflicting tokenomics (40/30/20/10 split vs 85/15 unified model)
 * Migration: All new deployments use TTXUnified.sol with clean 85/15 split
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TTXToken is ERC20, Ownable, Pausable {
    
    // Fee structure (in basis points: 100 = 1%)
    uint256 public transferFee = 10;  // 0.1% default fee
    uint256 public tradingFee = 25;   // 0.25% default trading fee
    uint256 public constant MAX_FEE = 500; // 5% maximum fee cap
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Fee distribution addresses
    address public stakingPool;      // For TTX stakers rewards
    address public liquidityPool;    // Platform liquidity/stability
    address public treasuryPool;     // Platform operations
    address public developmentPool;  // Development fund
    
    // Fee distribution percentages (must add up to 100)
    uint256 public stakingPoolPercent = 40;
    uint256 public liquidityPoolPercent = 30;
    uint256 public treasuryPoolPercent = 20;
    uint256 public developmentPoolPercent = 10;
    
    // Exemptions from fees
    mapping(address => bool) public isExemptFromFee;
    
    // Trading pairs (addresses that trigger trading fees)
    mapping(address => bool) public isTradingPair;
    
    // Events
    event FeeCollected(address indexed from, address indexed to, uint256 amount);
    event FeeDistributed(uint256 staking, uint256 liquidity, uint256 treasury, uint256 development);
    event FeesUpdated(uint256 transferFee, uint256 tradingFee);
    event PoolsUpdated(address staking, address liquidity, address treasury, address development);
    event ExemptionUpdated(address indexed account, bool isExempt);
    event TradingPairUpdated(address indexed pair, bool isTradingPair);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address _stakingPool,
        address _liquidityPool,
        address _treasuryPool,
        address _developmentPool
    ) ERC20(name, symbol) {
        require(_stakingPool != address(0), "Invalid staking pool");
        require(_liquidityPool != address(0), "Invalid liquidity pool");
        require(_treasuryPool != address(0), "Invalid treasury pool");
        require(_developmentPool != address(0), "Invalid development pool");
        
        stakingPool = _stakingPool;
        liquidityPool = _liquidityPool;
        treasuryPool = _treasuryPool;
        developmentPool = _developmentPool;
        
        // Mint initial supply to contract deployer
        _mint(msg.sender, initialSupply * 10**decimals());
        
        // Exempt fee pools from fees
        isExemptFromFee[_stakingPool] = true;
        isExemptFromFee[_liquidityPool] = true;
        isExemptFromFee[_treasuryPool] = true;
        isExemptFromFee[_developmentPool] = true;
        isExemptFromFee[msg.sender] = true; // Deployer exempt
    }
    
    /**
     * @dev Override transfer to include fee mechanism
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // Check if fee should be applied
        bool takeFee = !isExemptFromFee[from] && !isExemptFromFee[to];
        
        if (takeFee) {
            uint256 feeAmount;
            
            // Check if this is a trading pair transaction
            if (isTradingPair[from] || isTradingPair[to]) {
                feeAmount = (amount * tradingFee) / FEE_DENOMINATOR;
            } else {
                feeAmount = (amount * transferFee) / FEE_DENOMINATOR;
            }
            
            if (feeAmount > 0) {
                uint256 transferAmount = amount - feeAmount;
                
                // Transfer fee amount to this contract for distribution
                super._transfer(from, address(this), feeAmount);
                
                // Distribute fees to pools
                _distributeFees(feeAmount);
                
                // Transfer remaining amount to recipient
                super._transfer(from, to, transferAmount);
                
                emit FeeCollected(from, to, feeAmount);
            } else {
                super._transfer(from, to, amount);
            }
        } else {
            // No fee - direct transfer
            super._transfer(from, to, amount);
        }
    }
    
    /**
     * @dev Distribute collected fees to designated pools
     */
    function _distributeFees(uint256 feeAmount) private {
        uint256 toStaking = (feeAmount * stakingPoolPercent) / 100;
        uint256 toLiquidity = (feeAmount * liquidityPoolPercent) / 100;
        uint256 toTreasury = (feeAmount * treasuryPoolPercent) / 100;
        uint256 toDevelopment = feeAmount - toStaking - toLiquidity - toTreasury;
        
        if (toStaking > 0) super._transfer(address(this), stakingPool, toStaking);
        if (toLiquidity > 0) super._transfer(address(this), liquidityPool, toLiquidity);
        if (toTreasury > 0) super._transfer(address(this), treasuryPool, toTreasury);
        if (toDevelopment > 0) super._transfer(address(this), developmentPool, toDevelopment);
        
        emit FeeDistributed(toStaking, toLiquidity, toTreasury, toDevelopment);
    }
    
    /**
     * @dev Update fee percentages
     */
    function updateFees(uint256 _transferFee, uint256 _tradingFee) external onlyOwner {
        require(_transferFee <= MAX_FEE, "Transfer fee too high");
        require(_tradingFee <= MAX_FEE, "Trading fee too high");
        
        transferFee = _transferFee;
        tradingFee = _tradingFee;
        
        emit FeesUpdated(_transferFee, _tradingFee);
    }
    
    /**
     * @dev Update fee distribution percentages
     */
    function updateDistribution(
        uint256 _staking,
        uint256 _liquidity,
        uint256 _treasury,
        uint256 _development
    ) external onlyOwner {
        require(_staking + _liquidity + _treasury + _development == 100, "Must total 100%");
        
        stakingPoolPercent = _staking;
        liquidityPoolPercent = _liquidity;
        treasuryPoolPercent = _treasury;
        developmentPoolPercent = _development;
    }
    
    /**
     * @dev Update pool addresses
     */
    function updatePools(
        address _staking,
        address _liquidity,
        address _treasury,
        address _development
    ) external onlyOwner {
        require(_staking != address(0), "Invalid staking pool");
        require(_liquidity != address(0), "Invalid liquidity pool");
        require(_treasury != address(0), "Invalid treasury pool");
        require(_development != address(0), "Invalid development pool");
        
        stakingPool = _staking;
        liquidityPool = _liquidity;
        treasuryPool = _treasury;
        developmentPool = _development;
        
        emit PoolsUpdated(_staking, _liquidity, _treasury, _development);
    }
    
    /**
     * @dev Set fee exemption for an address
     */
    function setFeeExemption(address account, bool exempt) external onlyOwner {
        isExemptFromFee[account] = exempt;
        emit ExemptionUpdated(account, exempt);
    }
    
    /**
     * @dev Set trading pair status for an address
     */
    function setTradingPair(address pair, bool isTradingPairAddress) external onlyOwner {
        isTradingPair[pair] = isTradingPairAddress;
        emit TradingPairUpdated(pair, isTradingPairAddress);
    }
    
    /**
     * @dev Pause token transfers (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Burn tokens from caller
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
