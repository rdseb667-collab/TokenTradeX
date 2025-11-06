// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TTXReserveToken.sol";

/**
 * @title Tokenized Trading Position
 * @dev Revolutionary NFT that represents a share in a profitable trading position
 * Allows successful traders to sell % of their position to others
 * Platform maintains control via fees and position limits
 */
contract TokenizedPosition is ERC721, Ownable, ReentrancyGuard {
    TTXReserveToken public ttxToken;
    
    struct Position {
        address originalTrader;
        string symbol; // e.g., "BTC/USDT"
        uint256 entryPrice;
        uint256 currentValue;
        uint256 totalShares;
        uint256 sharesAvailable;
        uint256 sharePrice;
        uint256 profitShareBps; // Basis points original trader keeps
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
        PositionType positionType;
    }

    enum PositionType {
        LONG,
        SHORT,
        SPOT
    }

    // Position tracking
    uint256 private _positionIdCounter;
    mapping(uint256 => Position) public positions;
    mapping(uint256 => mapping(address => uint256)) public positionShares; // positionId => investor => shares
    mapping(address => uint256[]) public traderPositions; // trader => positionIds
    
    // Platform controls
    uint256 public platformFeeBps = 500; // 5% platform fee on tokenization
    uint256 public minSharesForTokenization = 100;
    uint256 public maxSharesForTokenization = 10000;
    uint256 public minTraderProfitShareBps = 7000; // Trader must keep min 70%
    
    // Reserve backing
    uint256 public totalReserveBacking;
    mapping(uint256 => uint256) public positionReserveBacking;

    // Events
    event PositionTokenized(
        uint256 indexed positionId,
        address indexed trader,
        string symbol,
        uint256 totalShares,
        uint256 sharePrice
    );
    event SharesPurchased(
        uint256 indexed positionId,
        address indexed investor,
        uint256 shares,
        uint256 totalCost
    );
    event PositionClosed(
        uint256 indexed positionId,
        uint256 finalValue,
        uint256 profit
    );
    event ProfitDistributed(
        uint256 indexed positionId,
        address indexed recipient,
        uint256 amount
    );

    constructor(address _ttxToken) ERC721("TokenTradeX Position", "TTXPOS") {
        ttxToken = TTXReserveToken(_ttxToken);
    }

    /**
     * @dev Tokenize a trading position
     * Trader must have profitable position to tokenize
     */
    function tokenizePosition(
        string memory symbol,
        uint256 entryPrice,
        uint256 currentValue,
        uint256 totalShares,
        uint256 sharePrice,
        uint256 profitShareBps,
        uint256 durationDays,
        PositionType positionType
    ) external nonReentrant returns (uint256) {
        require(totalShares >= minSharesForTokenization, "Below min shares");
        require(totalShares <= maxSharesForTokenization, "Exceeds max shares");
        require(profitShareBps >= minTraderProfitShareBps, "Trader share too low");
        require(profitShareBps < 10000, "Invalid profit share");
        require(currentValue > entryPrice, "Position must be profitable");
        
        uint256 positionId = _positionIdCounter++;
        
        // Calculate TTX reserve backing needed (10% of position value)
        uint256 reserveNeeded = currentValue / 10;
        
        positions[positionId] = Position({
            originalTrader: msg.sender,
            symbol: symbol,
            entryPrice: entryPrice,
            currentValue: currentValue,
            totalShares: totalShares,
            sharesAvailable: totalShares,
            sharePrice: sharePrice,
            profitShareBps: profitShareBps,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + (durationDays * 1 days),
            isActive: true,
            positionType: positionType
        });
        
        traderPositions[msg.sender].push(positionId);
        
        // Allocate TTX reserve
        ttxToken.allocateReserve(address(this), reserveNeeded, "Tokenized Position");
        positionReserveBacking[positionId] = reserveNeeded;
        totalReserveBacking += reserveNeeded;
        
        // Mint NFT to represent position
        _safeMint(msg.sender, positionId);
        
        emit PositionTokenized(positionId, msg.sender, symbol, totalShares, sharePrice);
        
        return positionId;
    }

    /**
     * @dev Purchase shares of a tokenized position
     */
    function purchaseShares(uint256 positionId, uint256 shares) external payable nonReentrant {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(block.timestamp < position.expiresAt, "Position expired");
        require(shares <= position.sharesAvailable, "Not enough shares available");
        
        uint256 totalCost = shares * position.sharePrice;
        uint256 platformFee = (totalCost * platformFeeBps) / 10000;
        uint256 traderPayment = totalCost - platformFee;
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Update position
        position.sharesAvailable -= shares;
        positionShares[positionId][msg.sender] += shares;
        
        // Transfer payments
        payable(position.originalTrader).transfer(traderPayment);
        payable(owner()).transfer(platformFee);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit SharesPurchased(positionId, msg.sender, shares, totalCost);
    }

    /**
     * @dev Close position and distribute profits
     * Only original trader or owner can close
     */
    function closePosition(uint256 positionId, uint256 finalValue) external nonReentrant {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(
            msg.sender == position.originalTrader || msg.sender == owner(),
            "Not authorized"
        );
        
        position.isActive = false;
        position.currentValue = finalValue;
        
        // Deallocate reserve
        ttxToken.deallocateReserve(address(this), positionReserveBacking[positionId]);
        totalReserveBacking -= positionReserveBacking[positionId];
        
        emit PositionClosed(positionId, finalValue, finalValue - position.entryPrice);
    }

    /**
     * @dev Distribute profits to shareholders
     * Callable by anyone, ensures fair distribution
     */
    function distributeProfits(uint256 positionId) external nonReentrant {
        Position storage position = positions[positionId];
        require(!position.isActive, "Position still active");
        require(position.currentValue > position.entryPrice, "No profit to distribute");
        
        uint256 totalProfit = position.currentValue - position.entryPrice;
        uint256 traderProfit = (totalProfit * position.profitShareBps) / 10000;
        uint256 investorProfit = totalProfit - traderProfit;
        
        // This is simplified - in production, would need escrow mechanism
        // and claim system for each shareholder
        
        emit ProfitDistributed(positionId, position.originalTrader, traderProfit);
    }

    /**
     * @dev Get position details
     */
    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    /**
     * @dev Get investor's shares in a position
     */
    function getInvestorShares(uint256 positionId, address investor) external view returns (uint256) {
        return positionShares[positionId][investor];
    }

    /**
     * @dev Get all positions created by a trader
     */
    function getTraderPositions(address trader) external view returns (uint256[] memory) {
        return traderPositions[trader];
    }

    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFeeBps;
    }

    /**
     * @dev Update position limits (owner only)
     */
    function setPositionLimits(
        uint256 minShares,
        uint256 maxShares,
        uint256 minTraderShare
    ) external onlyOwner {
        require(minShares < maxShares, "Invalid range");
        require(minTraderShare >= 5000, "Min trader share too low"); // At least 50%
        
        minSharesForTokenization = minShares;
        maxSharesForTokenization = maxShares;
        minTraderProfitShareBps = minTraderShare;
    }
}
