import { expect, test, type Locator, type Page } from "@playwright/test";

async function openConsole(page: Page) {
  await page.goto("/console", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Protocol Snapshot" })).toBeVisible();
}

async function clickConsoleTab(page: Page, name: string) {
  const link = page.locator("nav").getByRole("link").filter({ hasText: name });
  const href = await link.getAttribute("href");
  if (!href) {
    throw new Error(`Console tab "${name}" is missing href`);
  }

  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href.replaceAll("/", "\\/")}$`));
}

function panel(page: Page, title: string): Locator {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: title }),
  });
}

test.describe("Vault Token UI - public pages", () => {
  test("home renders project information and navigates to documentation sections", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "ERC-20 Token on Ethereum Sepolia" })).toBeVisible();
    await expect(page.getByText("ERC-20 DeFi Ecosystem")).toBeVisible();
    await page.getByRole("link", { name: "Tokenomics" }).click();
    await expect(
      page.getByRole("heading", { name: "Tokenomics" }),
    ).toBeInViewport();
    await expect(page.getByText("10,000,000")).toBeVisible();

    await page.getByRole("link", { name: "7 Contracts" }).click();
    await expect(page.getByRole("heading", { name: "7 Smart Contracts" })).toBeInViewport();
    const contractsMap = page.locator("#contracts-map");
    await expect(contractsMap.getByText("AirdropDistributor")).toBeVisible();
    await expect(contractsMap.getByText("StakingVault")).toBeVisible();
  });

  test("console shell exposes all major product areas", async ({ page }) => {
    await openConsole(page);

    for (const tab of ["Overview", "Staking", "Airdrop", "Locker", "Admin"]) {
      await expect(page.locator("nav").getByRole("link").filter({ hasText: tab })).toBeVisible();
    }

    await expect(page.getByText(/Ready\.|Syncing contract reads/)).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
  });
});

test.describe("Vault Token UI - disconnected wallet states", () => {
  test.beforeEach(async ({ page }) => {
    await openConsole(page);
  });

  test("staking form validates amount shape and keeps actions disabled without wallet", async ({ page }) => {
    await clickConsoleTab(page, "Staking");
    await expect(page.getByRole("heading", { name: "Stake VLT" })).toBeVisible();

    const stakePanel = panel(page, "Stake VLT");
    const stakeAmount = stakePanel.getByLabel("Stake amount", { exact: true });
    const stakeButton = stakePanel.getByRole("button", { name: /Stake VLT|Approve Vault/ });
    const unstakeButton = stakePanel.getByRole("button", { name: "Unstake" });
    const claimButton = stakePanel.getByRole("button", { name: "Claim Points" });

    await expect(stakeAmount).toBeVisible();
    await expect(stakeButton).toBeDisabled();
    await expect(unstakeButton).toBeDisabled();
    await expect(claimButton).toBeDisabled();

    await stakeAmount.fill("abc");
    await expect(stakeButton).toBeDisabled();

    await stakeAmount.fill("12.5");
    await expect(stakeAmount).toHaveValue("12.5");
    await expect(stakeButton).toBeDisabled();
  });

  test("airdrop claim is disabled for invalid, zero, and disconnected snapshot states", async ({ page }) => {
    await clickConsoleTab(page, "Airdrop");
    await expect(page.getByRole("heading", { name: "Claim Portal" })).toBeVisible();

    const claimPanel = panel(page, "Claim Portal");
    const snapshotInput = claimPanel.getByLabel("Snapshot ID");
    const claimButton = claimPanel.getByRole("button", { name: "Claim Token" });

    await expect(claimButton).toBeDisabled();
    await snapshotInput.fill("bad-id");
    await expect(claimButton).toBeDisabled();
    await snapshotInput.fill("0");
    await expect(claimButton).toBeDisabled();
    await expect(panel(page, "Airdrop State").getByText("Available check")).toBeVisible();
  });

  test("locker duration controls update selected option while lock action remains protected", async ({ page }) => {
    await clickConsoleTab(page, "Locker");
    await expect(page.getByRole("heading", { name: "Token Locker" })).toBeVisible();

    const lockerPanel = panel(page, "Token Locker");
    const lockAmount = lockerPanel.getByLabel("Lock amount");
    const lockButton = lockerPanel.getByRole("button", { name: /Lock VLT|Approve Locker/ });

    const defaultDuration = lockerPanel.locator("button").filter({ hasText: "30D" });
    const teamDuration = lockerPanel.locator("button").filter({ hasText: "180D" });

    await expect(defaultDuration).toHaveClass(/bg-violet-300/);
    await teamDuration.scrollIntoViewIfNeeded();
    await teamDuration.click();
    await expect(teamDuration).toHaveClass(/bg-violet-300/);

    await lockAmount.fill("50");
    await expect(lockButton).toBeDisabled();
    await expect(panel(page, "Locks").getByText("No locks for this wallet.")).toBeVisible();
  });

  test("admin controls are role-gated when no wallet is connected", async ({ page }) => {
    await clickConsoleTab(page, "Admin");
    await expect(page.getByRole("heading", { name: "Admin Controls" })).toBeVisible();

    const adminPanel = panel(page, "Admin Controls");
    await expect(adminPanel.getByRole("button", { name: /Open Trading|Trading Open/ })).toBeDisabled();
    await expect(adminPanel.getByRole("button", { name: "Snapshot" })).toBeDisabled();
    await expect(adminPanel.getByRole("button", { name: "Apply" })).toBeDisabled();
    await expect(adminPanel.getByRole("button", { name: "Pause", exact: true })).toBeDisabled();
    await expect(adminPanel.getByRole("button", { name: "Unpause" })).toBeDisabled();

    await adminPanel.getByLabel("Auto burn (%)").fill("11");
    await expect(adminPanel.getByRole("button", { name: "Apply" })).toBeDisabled();
    await expect(panel(page, "System Status").getByText("User")).toBeVisible();
  });
});
