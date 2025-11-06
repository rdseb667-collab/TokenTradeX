const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TTXUnified Safeguards", () => {
  let TTX, ttx, owner, user1, user2;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const TTXUnified = await ethers.getContractFactory("TTXUnified");
    ttx = await TTXUnified.deploy();
    await ttx.waitForDeployment();
  });

  describe("Revenue Delta Distribution", () => {
    it("distributes only revenue delta, monotonic rewardPerToken", async () => {
      // Transfer stake tokens to user1
      const amount = ethers.parseEther("1000");
      await ttx.connect(owner).transfer(user1.address, amount);
      await ttx.connect(user1).stake(amount);

      // Collect revenue #1
      await ttx.connect(owner).collectRevenue(0, ethers.parseEther("10"), { value: ethers.parseEther("10") });
      const rpt1 = await ttx.rewardPerTokenStored();

      // Collect revenue #2
      await ttx.connect(owner).collectRevenue(0, ethers.parseEther("5"), { value: ethers.parseEther("5") });
      const rpt2 = await ttx.rewardPerTokenStored();

      expect(rpt2).to.be.greaterThan(rpt1);
      
      // A second call without new revenue should not change RPT
      const rpt2a = await ttx.rewardPerToken();
      expect(rpt2a).to.equal(rpt2);
    });

    it("prevents double-counting of revenue", async () => {
      const amount = ethers.parseEther("1000");
      await ttx.connect(owner).transfer(user1.address, amount);
      await ttx.connect(user1).stake(amount);

      // Collect revenue
      await ttx.connect(owner).collectRevenue(0, ethers.parseEther("10"), { value: ethers.parseEther("10") });
      const earned1 = await ttx.calculateEarned(user1.address);

      // Call updateReward (via stake) without new revenue
      await ttx.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      await ttx.connect(user1).stake(ethers.parseEther("100"));
      const earned2 = await ttx.calculateEarned(user1.address);

      // Earned should be 0 since no new revenue
      expect(earned2).to.equal(0);
    });
  });

  describe("Pause Behavior", () => {
    it("disables fees while paused", async () => {
      // Transfer to user1 (fees on by default)
      await ttx.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      const totalBefore = await ttx.totalRevenueCollected();

      // Pause contract
      await ttx.connect(owner).pause();

      // Transfer while paused should not collect fees
      await ttx.connect(user1).transfer(user2.address, ethers.parseEther("10"));
      const totalAfter = await ttx.totalRevenueCollected();
      expect(totalAfter).to.equal(totalBefore);
    });

    it("allows unstake even when paused", async () => {
      // Setup stake
      await ttx.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      await ttx.connect(user1).stake(ethers.parseEther("50"));

      // Pause
      await ttx.connect(owner).pause();

      // Unstake should work (no lock)
      await expect(ttx.connect(user1).unstake(ethers.parseEther("10")))
        .to.emit(ttx, "Unstaked")
        .withArgs(user1.address, ethers.parseEther("10"));
    });
  });

  describe("Reserve Safety", () => {
    it("enforces 10% cap on reserve withdrawals", async () => {
      // Fund reserve by collecting revenue
      const reserveFund = ethers.parseEther("100");
      await ttx.connect(owner).collectRevenue(0, reserveFund, { value: reserveFund });
      const totalReserveAccumulated = await ttx.totalReserveAccumulated();
      const max = totalReserveAccumulated / BigInt(10);

      // Oversized buyback should revert
      await expect(
        ttx.connect(owner).buybackTTX(max + BigInt(1), user1.address)
      ).to.be.revertedWith("Max 10% per withdrawal");

      // Oversized utilize should revert
      await expect(
        ttx.connect(owner).utilizeReserve(max + BigInt(1), "ops")
      ).to.be.revertedWith("Max 10% per withdrawal");
    });

    it("uses call() for safe reserve transfers", async () => {
      const reserveFund = ethers.parseEther("100");
      await ttx.connect(owner).collectRevenue(0, reserveFund, { value: reserveFund });
      const totalReserveAccumulated = await ttx.totalReserveAccumulated();
      const max = totalReserveAccumulated / BigInt(10);

      // Allowed utilize succeeds with call()
      await expect(
        ttx.connect(owner).utilizeReserve(max, "ops")
      ).to.emit(ttx, "ReserveUtilized").withArgs(max, "ops");
    });

    it("enforces 10% cap on emergency withdraw", async () => {
      const reserveFund = ethers.parseEther("100");
      await ttx.connect(owner).collectRevenue(0, reserveFund, { value: reserveFund });
      const totalReserveAccumulated = await ttx.totalReserveAccumulated();
      const max = totalReserveAccumulated / BigInt(10);

      await expect(
        ttx.connect(owner).emergencyWithdrawReserve(max + BigInt(1))
      ).to.be.revertedWith("Max 10% per withdrawal for user protection");

      // Allowed amount works
      await ttx.connect(owner).emergencyWithdrawReserve(max);
      const newReserve = await ttx.totalReserveAccumulated();
      expect(newReserve).to.equal(totalReserveAccumulated - max);
    });
  });

  describe("Voting Power Decay", () => {
    it("decays voting power on unlock after expiry", async () => {
      const amount = ethers.parseEther("100");
      await ttx.connect(owner).transfer(user1.address, amount);
      const duration = 30 * 24 * 60 * 60; // 30 days
      await ttx.connect(user1).createLock(amount, duration);

      const vpBefore = await ttx.votingPower(user1.address);
      expect(vpBefore).to.be.greaterThan(0);

      // Advance time past lock expiry
      await time.increase(duration + 1);

      // Unlock half
      await ttx.connect(user1).unlock(ethers.parseEther("50"));
      const vpAfter = await ttx.votingPower(user1.address);
      
      // Should have roughly half the voting power left
      expect(vpAfter).to.be.lessThan(vpBefore);
      expect(vpAfter).to.be.closeTo(vpBefore / BigInt(2), ethers.parseEther("1"));
    });

    it("auto-decays voting power on interaction after lock expiry", async () => {
      const amount = ethers.parseEther("100");
      await ttx.connect(owner).transfer(user1.address, amount);
      const duration = 30 * 24 * 60 * 60;
      await ttx.connect(user1).createLock(amount, duration);

      const vpBefore = await ttx.votingPower(user1.address);
      expect(vpBefore).to.be.greaterThan(0);

      // Advance time past lock expiry
      await time.increase(duration + 1);

      // Any interaction should auto-decay
      await ttx.connect(owner).transfer(user1.address, ethers.parseEther("10"));
      await ttx.connect(user1).stake(ethers.parseEther("10"));

      const vpAfter = await ttx.votingPower(user1.address);
      expect(vpAfter).to.equal(0);
    });
  });

  describe("LP Staking Safety", () => {
    it("requires LP token to be set before staking", async () => {
      await expect(
        ttx.connect(user1).stakeLPTokens(ethers.parseEther("10"))
      ).to.be.revertedWith("LP token not set");
    });

    it("uses IERC20 for LP token transfers", async () => {
      // Deploy mock ERC20 as LP token
      const MockERC20 = await ethers.getContractFactory("TTXUnified");
      const mockLP = await MockERC20.deploy();
      await mockLP.waitForDeployment();

      // Set LP token
      await ttx.connect(owner).setLPToken(await mockLP.getAddress());

      // Transfer LP to user1
      await mockLP.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      // Approve ttx contract
      await mockLP.connect(user1).approve(await ttx.getAddress(), ethers.parseEther("50"));

      // Start LM program
      await ttx.connect(owner).startLiquidityMining(
        ethers.parseEther("1"),
        ethers.parseEther("10000"),
        90 * 24 * 60 * 60
      );

      // Stake LP tokens
      await expect(
        ttx.connect(user1).stakeLPTokens(ethers.parseEther("50"))
      ).to.not.be.reverted;

      expect(await ttx.lpBalances(user1.address)).to.equal(ethers.parseEther("50"));
    });
  });
});
