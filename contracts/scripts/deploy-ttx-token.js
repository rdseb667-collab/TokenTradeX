const hre = require("hardhat");

async function main() {
  console.log("Deploying TTX Reserve Token...");

  // Get the contract factory
  const TTXReserveToken = await hre.ethers.getContractFactory("TTXReserveToken");
  
  // Deploy the contract
  const ttxToken = await TTXReserveToken.deploy();
  
  await ttxToken.waitForDeployment();
  
  const address = await ttxToken.getAddress();
  
  console.log("TTX Reserve Token deployed to:", address);
  console.log("\nContract details:");
  console.log("- Total Supply: 1,000,000,000 TTX");
  console.log("- Platform Reserve: 600,000,000 TTX (60%)");
  console.log("- Circulating: 300,000,000 TTX (30%)");
  console.log("- Team Vested: 100,000,000 TTX (10%)");
  
  console.log("\nAdd this to your .env file:");
  console.log(`TTX_TOKEN_ADDRESS=${address}`);
  
  // Verify fee tiers
  console.log("\nFee Tiers configured:");
  for (let i = 0; i < 4; i++) {
    const tier = await ttxToken.feeTiers(i);
    console.log(`Tier ${i}: ${hre.ethers.formatEther(tier.minBalance)} TTX = ${tier.discountBps / 100}% discount`);
  }
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
