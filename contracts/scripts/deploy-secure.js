const hre = require("hardhat");

/**
 * Deploy TTXUnifiedSecure with proper security setup
 * 
 * DEPLOYMENT STEPS:
 * 1. Deploy contract with multisig as owner
 * 2. Grant REVENUE_COLLECTOR_ROLE to backend service
 * 3. Approve initial destination addresses
 * 4. Set up DEX pairs
 * 5. Verify all roles and permissions
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║    TTX Unified Secure Deployment                       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network: ${hre.network.name}\n`);
  
  // ==================== CONFIGURATION ====================
  
  // CRITICAL: Replace with your Gnosis Safe multisig address
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || deployer.address;
  
  // Backend service address that will collect revenue
  const REVENUE_COLLECTOR_ADDRESS = process.env.REVENUE_COLLECTOR_ADDRESS;
  
  // Additional approved destinations for reserve usage
  const APPROVED_DESTINATIONS = [
    MULTISIG_ADDRESS, // Always approve the multisig
    process.env.MARKETING_WALLET,
    process.env.OPERATIONS_WALLET,
  ].filter(addr => addr && addr !== 'undefined');
  
  console.log("🔐 Security Configuration:");
  console.log(`   Multisig (Owner): ${MULTISIG_ADDRESS}`);
  console.log(`   Revenue Collector: ${REVENUE_COLLECTOR_ADDRESS || 'Not set'}`);
  console.log(`   Approved Destinations: ${APPROVED_DESTINATIONS.length}\n`);
  
  if (MULTISIG_ADDRESS === deployer.address) {
    console.log("⚠️  WARNING: Using deployer as multisig. For production, use Gnosis Safe!");
    console.log("⚠️  Create a Safe at: https://safe.global\n");
  }
  
  // ==================== DEPLOY CONTRACT ====================
  
  console.log("📦 Deploying TTXUnifiedSecure...");
  
  const TTXUnifiedSecure = await hre.ethers.getContractFactory("TTXUnifiedSecure");
  const ttx = await TTXUnifiedSecure.deploy(MULTISIG_ADDRESS);
  
  await ttx.deployed();
  
  console.log(`✅ Contract deployed to: ${ttx.address}\n`);
  
  // ==================== GRANT ROLES ====================
  
  if (REVENUE_COLLECTOR_ADDRESS && REVENUE_COLLECTOR_ADDRESS !== 'undefined') {
    console.log("👤 Granting REVENUE_COLLECTOR_ROLE...");
    
    // If deployer is multisig, grant directly
    // If deployer is not multisig, this will fail (expected - must be done via multisig)
    try {
      const tx = await ttx.grantRevenueCollectorRole(REVENUE_COLLECTOR_ADDRESS);
      await tx.wait();
      console.log(`   ✅ Granted to: ${REVENUE_COLLECTOR_ADDRESS}\n`);
    } catch (error) {
      console.log("   ⚠️  Could not grant role (requires multisig approval)");
      console.log(`   📝 Action required: Multisig must call grantRevenueCollectorRole(${REVENUE_COLLECTOR_ADDRESS})\n`);
    }
  }
  
  // ==================== APPROVE DESTINATIONS ====================
  
  console.log("🎯 Approving destination addresses...");
  for (const dest of APPROVED_DESTINATIONS) {
    if (dest && dest !== MULTISIG_ADDRESS) { // Multisig already approved in constructor
      try {
        const tx = await ttx.approveDestination(dest, true);
        await tx.wait();
        console.log(`   ✅ Approved: ${dest}`);
      } catch (error) {
        console.log(`   ⚠️  Could not approve ${dest} (requires multisig approval)`);
      }
    }
  }
  console.log("");
  
  // ==================== VERIFICATION ====================
  
  console.log("🔍 Verifying deployment...\n");
  
  const ADMIN_ROLE = await ttx.ADMIN_ROLE();
  const REVENUE_COLLECTOR_ROLE = await ttx.REVENUE_COLLECTOR_ROLE();
  const TIMELOCK_ROLE = await ttx.TIMELOCK_ROLE();
  const GUARDIAN_ROLE = await ttx.GUARDIAN_ROLE();
  
  const hasAdminRole = await ttx.hasRole(ADMIN_ROLE, MULTISIG_ADDRESS);
  const hasTimelockRole = await ttx.hasRole(TIMELOCK_ROLE, MULTISIG_ADDRESS);
  const hasGuardianRole = await ttx.hasRole(GUARDIAN_ROLE, MULTISIG_ADDRESS);
  
  console.log("✅ Role Verification:");
  console.log(`   Multisig has ADMIN_ROLE: ${hasAdminRole ? '✅' : '❌'}`);
  console.log(`   Multisig has TIMELOCK_ROLE: ${hasTimelockRole ? '✅' : '❌'}`);
  console.log(`   Multisig has GUARDIAN_ROLE: ${hasGuardianRole ? '✅' : '❌'}\n`);
  
  if (REVENUE_COLLECTOR_ADDRESS) {
    const hasCollectorRole = await ttx.hasRole(REVENUE_COLLECTOR_ROLE, REVENUE_COLLECTOR_ADDRESS);
    console.log(`   Backend has REVENUE_COLLECTOR_ROLE: ${hasCollectorRole ? '✅' : '❌'}\n`);
  }
  
  const totalSupply = await ttx.totalSupply();
  const contractBalance = await ttx.balanceOf(ttx.address);
  
  console.log("📊 Token Stats:");
  console.log(`   Total Supply: ${hre.ethers.utils.formatEther(totalSupply)} TTX`);
  console.log(`   Contract Balance: ${hre.ethers.utils.formatEther(contractBalance)} TTX\n`);
  
  const timelockDelay = await ttx.timelockDelay();
  console.log("⏱️  Security Settings:");
  console.log(`   Timelock Delay: ${timelockDelay / 3600} hours\n`);
  
  // ==================== SUMMARY ====================
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║               Deployment Summary                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  console.log("📝 Contract Details:");
  console.log(`   Address: ${ttx.address}`);
  console.log(`   Owner: ${MULTISIG_ADDRESS}`);
  console.log(`   Network: ${hre.network.name}\n`);
  
  console.log("🔐 Security Features:");
  console.log("   ✅ Role-based access control");
  console.log("   ✅ 24-hour timelock on withdrawals");
  console.log("   ✅ Destination allowlist");
  console.log("   ✅ Daily (5%) and monthly (20%) caps");
  console.log("   ✅ 10% per-withdrawal limit\n");
  
  console.log("📋 Next Steps:");
  console.log("   1. Update backend .env with:");
  console.log(`      TTX_UNIFIED_ADDRESS=${ttx.address}`);
  
  if (!REVENUE_COLLECTOR_ADDRESS) {
    console.log(`   2. Grant REVENUE_COLLECTOR_ROLE to backend service`);
  }
  
  if (MULTISIG_ADDRESS === deployer.address) {
    console.log(`   3. Create Gnosis Safe multisig`);
    console.log(`   4. Transfer all roles to multisig`);
  }
  
  console.log(`   5. Set up DEX pairs with setDEXPair()`);
  console.log(`   6. Verify contract on Etherscan\n`);
  
  console.log("🔗 Useful Commands:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${ttx.address} ${MULTISIG_ADDRESS}\n`);
  
  // ==================== SAVE DEPLOYMENT INFO ====================
  
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: ttx.address,
    multisig: MULTISIG_ADDRESS,
    revenueCollector: REVENUE_COLLECTOR_ADDRESS,
    approvedDestinations: APPROVED_DESTINATIONS,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    timelockDelay: timelockDelay.toString(),
  };
  
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '../deployments', `${hre.network.name}.json`);
  
  // Create deployments directory if it doesn't exist
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentPath}\n`);
  
  console.log("✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
