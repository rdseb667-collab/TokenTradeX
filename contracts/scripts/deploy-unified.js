const hre = require("hardhat");

async function main() {
  console.log("========================================");
  console.log("  TTX UNIFIED TOKEN DEPLOYMENT");
  console.log("========================================\n");

  // Deploy TTXUnified
  console.log("Deploying TTXUnified contract...");
  const TTXUnified = await hre.ethers.getContractFactory("TTXUnified");
  const ttx = await TTXUnified.deploy();
  await ttx.waitForDeployment();
  
  const ttxAddress = await ttx.getAddress();
  console.log("✅ TTXUnified deployed to:", ttxAddress);

  // Get deployment details
  const totalSupply = await ttx.TOTAL_SUPPLY();
  const publicAlloc = await ttx.PUBLIC_ALLOCATION();
  const lmAlloc = await ttx.LIQUIDITY_MINING();
  
  console.log("\n========================================");
  console.log("  TOKEN DISTRIBUTION");
  console.log("========================================");
  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "TTX");
  console.log("Public (50%):", hre.ethers.formatEther(publicAlloc), "TTX");
  console.log("Liquidity Mining (20%):", hre.ethers.formatEther(lmAlloc), "TTX");
  console.log("Platform Reserve (15%):", hre.ethers.formatEther(await ttx.PLATFORM_RESERVE()), "TTX");
  console.log("Team (10%):", hre.ethers.formatEther(await ttx.TEAM_ALLOCATION()), "TTX");
  console.log("Early Adopters (5%):", hre.ethers.formatEther(await ttx.EARLY_ADOPTERS()), "TTX");

  console.log("\n========================================");
  console.log("  KEY FEATURES ENABLED");
  console.log("========================================");
  console.log("✅ Auto-compounding staking");
  console.log("✅ Ve-locking for governance");
  console.log("✅ 10 revenue streams");
  console.log("✅ Liquidity mining program");
  console.log("✅ Fee-on-transfer (0.1% transfer, 0.25% trading)");
  console.log("✅ Reserve backing");

  console.log("\n========================================");
  console.log("  REVENUE STREAMS");
  console.log("========================================");
  for (let i = 0; i < 10; i++) {
    const stream = await ttx.revenueStreams(i);
    console.log(`${i}. ${stream.name}`);
  }

  console.log("\n========================================");
  console.log("  NEXT STEPS");
  console.log("========================================");
  console.log("1. Update .env file:");
  console.log(`   TTX_UNIFIED_ADDRESS=${ttxAddress}`);
  console.log("\n2. Start liquidity mining:");
  console.log("   await ttx.startLiquidityMining(rewardRate, duration)");
  console.log("\n3. Create DEX liquidity pool");
  console.log("\n4. Set DEX pair address:");
  console.log("   await ttx.setDEXPair(pairAddress, true)");
  console.log("\n5. Distribute to early adopters");

  console.log("\n========================================");
  console.log("  CONTRACT VERIFICATION");
  console.log("========================================");
  console.log("Run this command to verify on BSCScan:");
  console.log(`npx hardhat verify --network bsc ${ttxAddress}`);

  return ttxAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
