import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [signer] = await ethers.getSigners();

  if (!signer) {
    throw new Error(
      "No signer available. Check SEPOLIA_PRIVATE_KEY in .env and hardhat network config.",
    );
  }

  const balance = await ethers.provider.getBalance(signer.address);

  console.log("Sepolia signer:", signer.address);
  console.log("Sepolia balance (ETH):", ethers.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
