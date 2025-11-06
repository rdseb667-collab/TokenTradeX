const hre = require("hardhat");

async function main() {
  console.log("Deploying TTX Token Contract...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Pool addresses (replace with actual addresses or deploy separate contracts)
  const stakingPool = "0x0000000000000000000000000000000000000001"; // TODO: Replace
  const liquidityPool = "0x0000000000000000000000000000000000000002"; // TODO: Replace
  const treasuryPool = "0x0000000000000000000000000000000000000003"; // TODO: Replace
  const developmentPool = "0x0000000000000000000000000000000000000004"; // TODO: Replace

  // Token parameters
  const tokenName = "TokenTradeX Token";
  const tokenSymbol = "TTX";
  const initialSupply = 1000000000; // 1 billion tokens

  // Deploy contract
  const TTXToken = await hre.ethers.getContractFactory("TTXToken");
  const ttx = await TTXToken.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    stakingPool,
    liquidityPool,
    treasuryPool,
    developmentPool
  );

  await ttx.deployed();

  console.log("TTX Token deployed to:", ttx.address);
  console.log("Token Name:", tokenName);
  console.log("Token Symbol:", tokenSymbol);
  console.log("Initial Supply:", initialSupply);
  console.log("\nPool Addresses:");
  console.log("- Staking Pool:", stakingPool);
  console.log("- Liquidity Pool:", liquidityPool);
  console.log("- Treasury Pool:", treasuryPool);
  console.log("- Development Pool:", developmentPool);

  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await ttx.deployTransaction.wait(6);

  // Verify contract on Etherscan (if on mainnet/testnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: ttx.address,
        constructorArguments: [
          tokenName,
          tokenSymbol,
          initialSupply,
          stakingPool,
          liquidityPool,
          treasuryPool,
          developmentPool
        ],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
