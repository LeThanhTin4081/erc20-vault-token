import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { configVariable, defineConfig } from "hardhat/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Doc file .env theo cach don gian de khong phu thuoc them package dotenv
function napBienMoiTruongTuFileEnv() {
  const duongDanEnv = resolve(process.cwd(), ".env");
  if (!existsSync(duongDanEnv)) return;

  const noiDung = readFileSync(duongDanEnv, "utf8");
  const dong = noiDung.split(/\r?\n/);

  for (const dongGoc of dong) {
    const dongDaTrim = dongGoc.trim();

    // Bo qua dong rong va dong comment
    if (!dongDaTrim || dongDaTrim.startsWith("#")) continue;

    const viTriDauBang = dongDaTrim.indexOf("=");
    if (viTriDauBang === -1) continue;

    const key = dongDaTrim.slice(0, viTriDauBang).trim();
    let value = dongDaTrim.slice(viTriDauBang + 1).trim();

    // Ho tro gia tri co dau nhay don/doi
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Khong ghi de neu bien da co trong environment cua he thong
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

napBienMoiTruongTuFileEnv();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
