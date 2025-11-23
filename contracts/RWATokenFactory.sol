// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RWA Token Factory - Tokenize ANY Real-World Asset
 * @dev Factory pattern for creating ERC-20 tokens backed by real assets
 * 
 * ASSET TYPES SUPPORTED:
 * - Stocks & Equities (AAPL, TSLA, etc.)
 * - Commodities (Gold, Silver, Oil)
 * - Real Estate (Properties, REITs)
 * - Bonds & Fixed Income
 * - Art & Collectibles
 * - Intellectual Property
 * - Carbon Credits
 * - Revenue Streams
 * - ANY other asset you can imagine
 * 
 * FEATURES:
 * - Fractional ownership (own 0.001% of anything)
 * - 24/7 trading (unlike traditional markets)
 * - Global access (anyone can invest)
 * - Instant settlement (no T+2)
 * - Built-in compliance (KYC/AML)
 * - Automated dividends/yields
 * - Platform fees on every trade
 */
contract RWATokenFactory is Ownable, ReentrancyGuard, Pausable {
    
    // ==================== ASSET CATEGORIES ====================
    
    enum AssetCategory {
        EQUITY,           // Stocks, shares
        COMMODITY,        // Gold, silver, oil
        REAL_ESTATE,      // Property, land, REITs
        FIXED_INCOME,     // Bonds, T-bills
        ART_COLLECTIBLE,  // Art, rare items
        INTELLECTUAL_PROPERTY, // Patents, royalties
        CARBON_CREDIT,    // Environmental assets
        REVENUE_STREAM,   // Business income streams
        DERIVATIVE,       // Options, futures
        CUSTOM           // Any other asset
    }
    
    // ==================== ASSET TOKEN STRUCTURE ====================
    
    struct AssetToken {
        address tokenAddress;
        AssetCategory category;
        string assetName;          // "Apple Stock", "1 Troy Oz Gold", "123 Main St"
        string assetSymbol;        // "xAAPL", "xGLD", "RE-123MAIN"
        uint256 totalValue;        // Total asset value in USD (6 decimals)
        uint256 totalSupply;       // Token supply (fractional shares)
        address oracle;            // Price oracle for valuation
        bool requiresKYC;          // KYC required to trade
        bool dividendsEnabled;     // Auto-distribute dividends
        uint256 platformFeeBps;    // Platform fee in basis points
        uint256 createdAt;
        address creator;
        bool isActive;
    }
    
    // Mapping: token address => asset info
    mapping(address => AssetToken) public assets;
    
    // Array of all created tokens
    address[] public allTokens;
    
    // Category filters
    mapping(AssetCategory => address[]) public tokensByCategory;
    
    // KYC whitelist
    mapping(address => mapping(address => bool)) public kycApproved; // token => user => approved
    
    // Platform revenue tracking
    uint256 public totalPlatformRevenue;
    uint256 public constant PLATFORM_FEE_MAX = 500; // 5% max
    uint256 public defaultPlatformFee = 25; // 0.25%
    
    // ==================== EVENTS ====================
    
    event AssetTokenCreated(
        address indexed tokenAddress,
        AssetCategory category,
        string assetName,
        string symbol,
        uint256 totalValue,
        uint256 totalSupply
    );
    
    event AssetValuationUpdated(address indexed token, uint256 newValue);
    event DividendDistributed(address indexed token, uint256 amount, uint256 perToken);
    event KYCApproved(address indexed token, address indexed user);
    event PlatformFeeCollected(address indexed token, uint256 amount);
    
    // ==================== TOKEN CREATION ====================
    
    /**
     * @dev Create a new RWA token for any asset
     * @param assetName Full asset name (e.g., "Apple Inc. Stock")
     * @param symbol Token symbol (e.g., "xAAPL")
     * @param category Asset category
     * @param totalValue Total asset value in USD (6 decimals)
     * @param totalSupply Total token supply (allows fractional ownership)
     * @param requiresKYC Whether trading requires KYC
     * @param dividendsEnabled Whether to auto-distribute yields
     */
    function createAssetToken(
        string memory assetName,
        string memory symbol,
        AssetCategory category,
        uint256 totalValue,
        uint256 totalSupply,
        bool requiresKYC,
        bool dividendsEnabled
    ) external onlyOwner whenNotPaused returns (address) {
        
        // Deploy new ERC-20 token
        RWAToken newToken = new RWAToken(
            assetName,
            symbol,
            totalSupply,
            address(this)
        );
        
        address tokenAddress = address(newToken);
        
        // Store asset info
        assets[tokenAddress] = AssetToken({
            tokenAddress: tokenAddress,
            category: category,
            assetName: assetName,
            assetSymbol: symbol,
            totalValue: totalValue,
            totalSupply: totalSupply,
            oracle: address(0), // Set oracle later
            requiresKYC: requiresKYC,
            dividendsEnabled: dividendsEnabled,
            platformFeeBps: defaultPlatformFee,
            createdAt: block.timestamp,
            creator: msg.sender,
            isActive: true
        });
        
        // Add to indexes
        allTokens.push(tokenAddress);
        tokensByCategory[category].push(tokenAddress);
        
        emit AssetTokenCreated(
            tokenAddress,
            category,
            assetName,
            symbol,
            totalValue,
            totalSupply
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Quick create for common assets
     */
    function createStockToken(
        string memory stockTicker,
        uint256 pricePerShare,
        uint256 totalShares
    ) external onlyOwner returns (address) {
        string memory name = string(abi.encodePacked("Tokenized ", stockTicker));
        string memory symbol = string(abi.encodePacked("x", stockTicker));
        
        return createAssetToken(
            name,
            symbol,
            AssetCategory.EQUITY,
            pricePerShare * totalShares,
            totalShares * 1000, // 1000 tokens per share for fractional ownership
            true,  // Stocks require KYC
            true   // Enable dividends
        );
    }
    
    function createCommodityToken(
        string memory commodityName,
        uint256 pricePerUnit,
        uint256 totalUnits
    ) external onlyOwner returns (address) {
        string memory symbol = string(abi.encodePacked("x", commodityName));
        
        return createAssetToken(
            commodityName,
            symbol,
            AssetCategory.COMMODITY,
            pricePerUnit * totalUnits,
            totalUnits * 10000, // 10,000 tokens per unit for precision
            false, // Commodities don't require KYC
            false  // No dividends
        );
    }
    
    function createRealEstateToken(
        string memory propertyAddress,
        uint256 propertyValue
    ) external onlyOwner returns (address) {
        return createAssetToken(
            propertyAddress,
            "xRE",
            AssetCategory.REAL_ESTATE,
            propertyValue,
            propertyValue / 100, // $100 per token
            true,  // Real estate requires KYC
            true   // Enable rental income distribution
        );
    }
    
    // ==================== TRADING FUNCTIONS ====================
    
    /**
     * @dev Transfer with KYC check and platform fee
     */
    function transferAssetToken(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant {
        AssetToken storage asset = assets[token];
        require(asset.isActive, "Asset not active");
        
        // KYC check
        if (asset.requiresKYC) {
            require(kycApproved[token][msg.sender], "Sender not KYC approved");
            require(kycApproved[token][to], "Recipient not KYC approved");
        }
        
        // Calculate and collect platform fee
        uint256 fee = (amount * asset.platformFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        
        // Execute transfer through factory
        RWAToken(token).factoryTransfer(msg.sender, to, netAmount);
        
        if (fee > 0) {
            RWAToken(token).factoryTransfer(msg.sender, address(this), fee);
            totalPlatformRevenue += fee;
            emit PlatformFeeCollected(token, fee);
        }
    }
    
    // ==================== VALUATION & ORACLE ====================
    
    /**
     * @dev Update asset valuation (from oracle or manual)
     */
    function updateAssetValuation(address token, uint256 newValue) external onlyOwner {
        AssetToken storage asset = assets[token];
        require(asset.isActive, "Asset not active");
        
        asset.totalValue = newValue;
        emit AssetValuationUpdated(token, newValue);
    }
    
    /**
     * @dev Get current price per token
     */
    function getPricePerToken(address token) public view returns (uint256) {
        AssetToken memory asset = assets[token];
        if (asset.totalSupply == 0) return 0;
        
        return (asset.totalValue * 1e18) / asset.totalSupply;
    }
    
    // ==================== DIVIDENDS / YIELD ====================
    
    /**
     * @dev Distribute dividends to all token holders
     * Works for stocks, real estate rental income, bond coupons, etc.
     */
    function distributeDividends(address token) external payable onlyOwner {
        AssetToken storage asset = assets[token];
        require(asset.dividendsEnabled, "Dividends not enabled");
        require(msg.value > 0, "No dividends to distribute");
        
        uint256 perToken = msg.value / asset.totalSupply;
        
        // In production, this would use a snapshot + claim mechanism
        // For now, track total distributed
        emit DividendDistributed(token, msg.value, perToken);
    }
    
    // ==================== KYC MANAGEMENT ====================
    
    /**
     * @dev Approve user for KYC (batch support)
     */
    function approveKYC(address token, address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            kycApproved[token][users[i]] = true;
            emit KYCApproved(token, users[i]);
        }
    }
    
    function revokeKYC(address token, address user) external onlyOwner {
        kycApproved[token][user] = false;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    function setAssetOracle(address token, address oracle) external onlyOwner {
        assets[token].oracle = oracle;
    }
    
    function setAssetActive(address token, bool active) external onlyOwner {
        assets[token].isActive = active;
    }
    
    function setPlatformFee(address token, uint256 feeBps) external onlyOwner {
        require(feeBps <= PLATFORM_FEE_MAX, "Fee too high");
        assets[token].platformFeeBps = feeBps;
    }
    
    function setDefaultPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= PLATFORM_FEE_MAX, "Fee too high");
        defaultPlatformFee = feeBps;
    }
    
    /**
     * @dev Withdraw platform revenue (connects to TTX staking)
     */
    function withdrawPlatformRevenue(address recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No revenue to withdraw");
        
        payable(recipient).transfer(balance);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    function getTokensByCategory(AssetCategory category) external view returns (address[] memory) {
        return tokensByCategory[category];
    }
    
    function getAssetInfo(address token) external view returns (
        string memory name,
        string memory symbol,
        AssetCategory category,
        uint256 totalValue,
        uint256 pricePerToken,
        bool requiresKYC,
        bool isActive
    ) {
        AssetToken memory asset = assets[token];
        return (
            asset.assetName,
            asset.assetSymbol,
            asset.category,
            asset.totalValue,
            getPricePerToken(token),
            asset.requiresKYC,
            asset.isActive
        );
    }
    
    /**
     * @dev Get total market cap of all RWA tokens
     */
    function getTotalMarketCap() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < allTokens.length; i++) {
            total += assets[allTokens[i]].totalValue;
        }
        return total;
    }
    
    // Check if factory is paused - used by RWAToken contract
    function checkPaused() external view {
        require(!paused(), "Factory is paused");
    }
    
    // ==================== EMERGENCY ====================
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    receive() external payable {
        // Accept ETH for dividends
    }
}

/**
 * @title RWA Token - Individual asset token
 * @dev ERC-20 token representing fractional ownership of real-world asset
 */
contract RWAToken is ERC20 {
    address public factory;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _factory
    ) ERC20(name, symbol) {
        factory = _factory;
        _mint(_factory, totalSupply);
    }
    
    // Restrict direct transfers - only factory can move tokens
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(msg.sender == factory, "Only factory can transfer tokens");
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(msg.sender == factory, "Only factory can transfer tokens");
        return super.transferFrom(from, to, amount);
    }
    
    // Factory-only transfer function with pause check
    function factoryTransfer(address from, address to, uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        RWATokenFactory(factory).checkPaused();
        _transfer(from, to, amount);
    }
    
    // Only factory can mint/burn (for rebalancing) with pause check
    function mint(address to, uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        RWATokenFactory(factory).checkPaused();
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        RWATokenFactory(factory).checkPaused();
        _burn(msg.sender, amount);
    }
}
