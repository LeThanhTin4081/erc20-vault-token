import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeploySystem", (m) => {
  // Skeleton: Triển khai 7 Contract theo thứ tự
  // 1. AccessManager
  const accessManager = m.contract("AccessManager");

  // 2. LaunchToken
  // 3. TokenLocker
  // 4. StakingVault
  // 5. AirdropPoints
  // 6. Treasury
  // 7. AirdropDistributor

  return { accessManager };
});
