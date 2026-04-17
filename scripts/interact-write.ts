import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const contractAddress = process.env.VAULT_TOKEN_ADDRESS;
  const recipient = process.env.TRANSFER_TO;
  const amount = process.env.TRANSFER_AMOUNT ?? "1";

  if (!contractAddress) {
    throw new Error("Missing VAULT_TOKEN_ADDRESS in .env");
  }

  if (!recipient) {
    throw new Error("Missing TRANSFER_TO in .env");
  }

  const token = await ethers.getContractAt("VaultToken", contractAddress);
  const tx = await token.transfer(recipient, ethers.parseUnits(amount, await token.decimals()));

  console.log("Transfer tx hash:", tx.hash);
  await tx.wait();
  console.log("Transfer confirmed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
