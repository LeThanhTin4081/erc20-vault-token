import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const token = await ethers.deployContract("VaultToken");
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const deploymentTx = token.deploymentTransaction();

  console.log("VaultToken deployed to:", contractAddress);
  console.log("Deployment tx hash:", deploymentTx?.hash ?? "N/A");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
