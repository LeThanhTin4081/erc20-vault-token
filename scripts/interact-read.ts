import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const contractAddress = process.env.VAULT_TOKEN_ADDRESS;

  if (!contractAddress) {
    throw new Error("Missing VAULT_TOKEN_ADDRESS in .env");
  }

  const token = await ethers.getContractAt("VaultToken", contractAddress);

  console.log("VaultToken:", contractAddress);
  console.log("name:", await token.name());
  console.log("symbol:", await token.symbol());
  console.log("totalSupply:", (await token.totalSupply()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
