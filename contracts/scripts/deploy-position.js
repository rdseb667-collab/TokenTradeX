const hre = require("hardhat");

async function main() {
  // Get TTX Token address from environment or pass as argument
  const ttxTokenAddress = process.env.TTX_TOKEN_ADDRESS || process.argv[2];
  
  if (!ttxTokenAddress) {
    throw new Error("TTX Token address not provided. Set TTX_TOKEN_ADDRESS or pass as argument");
  }
  
  console.log("Deploying Tokenized Position Contract...");
  console.log("TTX Token Address:", ttxTokenAddress);

  // Get the contract factory
  const TokenizedPosition = await hre.ethers.getContractFactory("TokenizedPosition");
  
  // Deploy the contract
  const positionContract = await TokenizedPosition.deploy(ttxTokenAddress);
  
  await positionContract.waitForDeployment();
  
  const address = await positionContract.getAddress();
  
  console.log("Tokenized Position Contract deployed to:", address);
  
  console.log("\nAdd this to your .env file:");
  console.log(`TOKENIZED_POSITION_ADDRESS=${address}`);
  
  // Display initial configuration
  const platformFee = await positionContract.platformFeeBps();
  const minShares = await positionContract.minSharesForTokenization();
  const maxShares = await positionContract.maxSharesForTokenization();
  const minTraderShare = await positionContract.minTraderProfitShareBps();
  
  console.log("\nContract Configuration:");
  console.log(`- Platform Fee: ${platformFee / 100}%`);
  console.log(`- Min Shares: ${minShares}`);
  console.log(`- Max Shares: ${maxShares}`);
  console.log(`- Min Trader Profit Share: ${minTraderShare / 100}%`);
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
