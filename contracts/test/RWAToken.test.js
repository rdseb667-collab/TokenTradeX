const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWAToken Transfer Restrictions", () => {
  let RWATokenFactory, rwaTokenFactory, rwaToken, owner, user1, user2;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy RWA Token Factory
    const RWATokenFactoryContract = await ethers.getContractFactory("RWATokenFactory");
    rwaTokenFactory = await RWATokenFactoryContract.deploy();
    await rwaTokenFactory.waitForDeployment();
    
    // Create a new RWA token
    const tx = await rwaTokenFactory.connect(owner).createAssetToken(
      "Test Real Estate",
      "xRE",
      2, // REAL_ESTATE category
      ethers.parseEther("1000000"), // $1M property
      ethers.parseEther("10000"), // 10,000 tokens
      true, // requires KYC
      true // dividends enabled
    );
    
    const receipt = await tx.wait();
    const tokenAddress = receipt.logs[0].args.tokenAddress;
    
    // Get the deployed RWA token
    const RWATokenContract = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenContract.attach(tokenAddress);
  });

  describe("Direct Transfer Restrictions", () => {
    it("should prevent direct transfers from non-factory addresses", async () => {
      // Mint some tokens to user1 through factory
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Transfer tokens from factory to user1
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Attempt direct transfer from user1 to user2 (should fail)
      await expect(
        rwaToken.connect(user1).transfer(user2.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Only factory can transfer tokens");
    });

    it("should prevent direct transferFrom from non-factory addresses", async () => {
      // Mint some tokens to user1 through factory
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Transfer tokens from factory to user1
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Approve user2 to spend user1's tokens
      await rwaToken.connect(user1).approve(user2.address, ethers.parseEther("50"));
      
      // Attempt direct transferFrom from user2 (should fail)
      await expect(
        rwaToken.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("50"))
      ).to.be.revertedWith("Only factory can transfer tokens");
    });
  });

  describe("Factory-Only Transfer", () => {
    it("should allow factory to transfer tokens", async () => {
      // Approve users for KYC
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Transfer tokens through factory
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Verify user1 received tokens
      const balance = await rwaToken.balanceOf(user1.address);
      expect(balance).to.equal(ethers.parseEther("100"));
    });

    it("should collect platform fees on factory transfers", async () => {
      // Approve users for KYC
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Get factory revenue before transfer
      const revenueBefore = await rwaTokenFactory.totalPlatformRevenue();
      
      // Transfer tokens through factory (100 tokens with default 0.25% fee)
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Verify platform revenue increased
      const revenueAfter = await rwaTokenFactory.totalPlatformRevenue();
      const feeCollected = revenueAfter - revenueBefore;
      
      // Fee should be 0.25% of 100 = 0.25 tokens
      expect(feeCollected).to.equal(ethers.parseEther("0.25"));
    });
  });

  describe("Factory Pause Functionality", () => {
    it("should prevent token transfers when factory is paused", async () => {
      // Approve users for KYC
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Transfer tokens through factory
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Pause the factory
      await rwaTokenFactory.connect(owner).pause();
      
      // Attempt to transfer tokens through factory (should fail)
      await expect(
        rwaTokenFactory.connect(owner).transferAssetToken(
          await rwaToken.getAddress(),
          user2.address,
          ethers.parseEther("50")
        )
      ).to.be.revertedWith("Factory is paused");
    });
    
    it("should prevent minting when factory is paused", async () => {
      // Pause the factory
      await rwaTokenFactory.connect(owner).pause();
      
      // Attempt to mint tokens (should fail)
      await expect(
        rwaToken.connect(owner).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Only factory");
      
      // Even if called by factory, should fail due to pause
      await expect(
        rwaTokenFactory.connect(owner).createAssetToken(
          "Test Asset",
          "xTEST",
          0, // EQUITY category
          ethers.parseEther("1000"),
          ethers.parseEther("100"),
          false,
          false
        )
      ).to.be.revertedWith("Pausable: paused");
    });
    
    it("should allow transfers after factory is unpaused", async () => {
      // Approve users for KYC
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user1.address);
      await rwaTokenFactory.connect(owner).approveKYC(await rwaToken.getAddress(), user2.address);
      
      // Pause the factory
      await rwaTokenFactory.connect(owner).pause();
      
      // Unpause the factory
      await rwaTokenFactory.connect(owner).unpause();
      
      // Transfer tokens through factory (should succeed)
      await rwaTokenFactory.connect(owner).transferAssetToken(
        await rwaToken.getAddress(),
        user1.address,
        ethers.parseEther("100")
      );
      
      // Verify user1 received tokens
      const balance = await rwaToken.balanceOf(user1.address);
      expect(balance).to.equal(ethers.parseEther("100"));
    });
  });
});