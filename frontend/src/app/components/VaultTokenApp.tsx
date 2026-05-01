"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Archive,
  ArrowDownToLine,
  BarChart3,
  Coins,
  Flame,
  Gift,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Unlock,
  UserCog,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  formatUnits,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  useChainId,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  accessManagerAbi,
  airdropDistributorAbi,
  airdropPointsAbi,
  contractAddresses,
  sepoliaChain,
  launchTokenAbi,
  roles,
  stakingVaultAbi,
  tokenLockerAbi,
  treasuryAbi,
} from "@/lib/contracts";
import {
  ActionButton,
  Field,
  Panel,
  StatCard,
  cx,
} from "./ui";
import { AboutContent } from "./AboutContent";
import { AppBackdrop, AppLoader } from "./AppBackdrop";
import { HomeContent } from "./HomeContent";
import { TokenValue } from "./token-display";
import { TopBar } from "./TopBar";
import type { AppMode, StarPoint, ViewId } from "./types";

type ReadEntry = {
  status?: string;
  result?: unknown;
};

type LockRecord = {
  id: number;
  amount: bigint;
  unlockTime: bigint;
  isReleased: boolean;
};

const zeroAddress =
  "0x0000000000000000000000000000000000000000" as Address;

const navigation: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "staking", label: "Staking", icon: Coins },
  { id: "airdrop", label: "Airdrop", icon: Gift },
  { id: "locker", label: "Locker", icon: Lock },
  { id: "admin", label: "Admin", icon: UserCog },
];

const lockDurations = [
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "180D", value: "180" },
  { label: "365D", value: "365" },
];

function readResult<T>(
  data: readonly unknown[] | undefined,
  index: number,
  fallback: T,
) {
  const entry = data?.[index] as ReadEntry | undefined;
  return entry?.status === "success" ? (entry.result as T) : fallback;
}

function groupDigits(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatToken(value: bigint, fractionDigits = 4) {
  const [whole, fraction = ""] = formatUnits(value, 18).split(".");
  const trimmed = fraction.slice(0, fractionDigits).replace(/0+$/, "");
  return `${groupDigits(whole)}${trimmed ? `.${trimmed}` : ""}`;
}

function formatCompactToken(value: bigint) {
  const numberValue = Number(formatUnits(value, 18));

  if (!Number.isFinite(numberValue)) {
    return formatToken(value, 2);
  }

  if (Math.abs(numberValue) >= 1_000_000_000_000) {
    return `${new Intl.NumberFormat("en", {
      maximumFractionDigits: 2,
      notation: "compact",
    }).format(numberValue)}`;
  }

  return formatToken(value);
}

function formatAddress(address?: Address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatFullAddress(address: Address) {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function formatBps(value: bigint) {
  return `${(Number(value) / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function parseTokenInput(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  try {
    const parsed = parseUnits(normalized, 18);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseSnapshotInput(value: string) {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  return BigInt(normalized);
}

function parseBurnInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) return null;
  return BigInt(Math.round(parsed * 100));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const firstLine = error.message.split("\n")[0];
    if (firstLine.toLowerCase().includes("user rejected")) {
      return "Request canceled in MetaMask.";
    }

    return firstLine || "Transaction failed.";
  }

  return "Transaction failed.";
}

function secondsUntil(unlockTime: bigint, now: number) {
  const unlockAt = Number(unlockTime);
  return Math.max(0, unlockAt - now);
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return "Ready";

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function makeStarLayer(
  total: number,
  seed: number,
  sizeBase: number,
  sizeVariance: number,
  durationBase: number,
  durationVariance: number,
  pullFactor: number,
) {
  const stars: StarPoint[] = [];
  for (let i = 0; i < total; i += 1) {
    const left = (seed + i * 41) % 100;
    const top = (seed * 2 + i * 67) % 100;
    const size = sizeBase + (i % sizeVariance);
    const duration = durationBase + (i % durationVariance);
    stars.push({
      left,
      top,
      size,
      delay: (i % 13) * 0.35,
      duration,
      dx: (50 - left) * pullFactor,
      dy: (50 - top) * pullFactor,
    });
  }
  return stars;
}

export default function VaultTokenApp({
  initialMode = "home",
  initialView = "overview",
}: {
  initialMode?: AppMode;
  initialView?: ViewId;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const account = address ?? zeroAddress;
  const isWrongNetwork = isConnected && chainId !== sepoliaChain.id;

  const appMode = initialMode;
  const activeView = initialView;
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [snapshotId, setSnapshotId] = useState("0");
  const [lockAmount, setLockAmount] = useState("");
  const [lockDuration, setLockDuration] = useState("30");
  const [burnRate, setBurnRate] = useState("0");
  const [notice, setNotice] = useState("Ready");
  const [pendingHash, setPendingHash] = useState<Hash>();
  const [pendingLabel, setPendingLabel] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [showAppLoader, setShowAppLoader] = useState(true);
  const nearStars = useMemo(
    () => makeStarLayer(50, 13, 2, 3, 9, 6, 1),
    [],
  );
  const midStars = useMemo(
    () => makeStarLayer(68, 27, 1, 3, 12, 7, 0.78),
    [],
  );
  const farStars = useMemo(
    () => makeStarLayer(92, 43, 1, 2, 16, 8, 0.62),
    [],
  );

  const { writeContractAsync, isPending: isWalletPending } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: {
      enabled: Boolean(pendingHash),
    },
  });

  const {
    data: dashboardData,
    refetch: refetchDashboard,
    isLoading: isDashboardLoading,
  } = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "balanceOf",
        args: [account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "totalSupply",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "tradingOpen",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "burnRate",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "totalStaked",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "pendingRewards",
        args: [account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "userInfo",
        args: [account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.airdropPoints,
        abi: airdropPointsAbi,
        functionName: "getCurrentPoints",
        args: [account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.airdropPoints,
        abi: airdropPointsAbi,
        functionName: "currentSnapshotId",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.tokenLocker,
        abi: tokenLockerAbi,
        functionName: "getLockCount",
        args: [account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [account, contractAddresses.stakingVault],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [account, contractAddresses.tokenLocker],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.accessManager,
        abi: accessManagerAbi,
        functionName: "hasRole",
        args: [roles.admin, account],
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.treasury,
        abi: treasuryAbi,
        functionName: "getBalance",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "paused",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "rewardRate",
        chainId: sepoliaChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [contractAddresses.treasury, contractAddresses.airdropDistributor],
        chainId: sepoliaChain.id,
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const selectedSnapshot = parseSnapshotInput(snapshotId);
  const {
    data: airdropData,
    refetch: refetchAirdrop,
  } = useReadContracts({
    allowFailure: true,
    contracts:
      selectedSnapshot === null
        ? []
        : [
          {
            address: contractAddresses.airdropDistributor,
            abi: airdropDistributorAbi,
            functionName: "calculateReward",
            args: [account, selectedSnapshot],
            chainId: sepoliaChain.id,
          },
          {
            address: contractAddresses.airdropDistributor,
            abi: airdropDistributorAbi,
            functionName: "claimed",
            args: [selectedSnapshot, account],
            chainId: sepoliaChain.id,
          },
          {
            address: contractAddresses.airdropPoints,
            abi: airdropPointsAbi,
            functionName: "getPoints",
            args: [account, selectedSnapshot],
            chainId: sepoliaChain.id,
          },
        ],
    query: {
      enabled: Boolean(address) && selectedSnapshot !== null,
      refetchInterval: 5_000,
    },
  });

  const tokenBalance = readResult<bigint>(dashboardData, 0, 0n);
  const totalSupply = readResult<bigint>(dashboardData, 1, 0n);
  const tradingOpen = readResult<boolean>(dashboardData, 2, false);
  const currentBurnRate = readResult<bigint>(dashboardData, 3, 0n);
  const totalStaked = readResult<bigint>(dashboardData, 4, 0n);
  const pendingRewards = readResult<bigint>(dashboardData, 5, 0n);
  const userInfo = readResult<readonly [bigint, bigint, bigint]>(
    dashboardData,
    6,
    [0n, 0n, 0n],
  );
  const currentPoints = readResult<bigint>(dashboardData, 7, 0n);
  const currentSnapshotId = readResult<bigint>(dashboardData, 8, 0n);
  const lockCount = readResult<bigint>(dashboardData, 9, 0n);
  const stakingAllowance = readResult<bigint>(dashboardData, 10, 0n);
  const lockerAllowance = readResult<bigint>(dashboardData, 11, 0n);
  const isAdmin = readResult<boolean>(dashboardData, 12, false);
  const treasuryBalance = readResult<bigint>(dashboardData, 13, 0n);
  const isPaused = readResult<boolean>(dashboardData, 14, false);
  const rewardRate = readResult<bigint>(dashboardData, 15, 0n);
  const treasuryDistributorAllowance = readResult<bigint>(dashboardData, 16, 0n);

  const stakedAmount = userInfo[0];
  const unclaimedStoredRewards = userInfo[2];
  const selectedReward = readResult<bigint>(airdropData, 0, 0n);
  const selectedClaimed = readResult<boolean>(airdropData, 1, false);
  const selectedPoints = readResult<bigint>(airdropData, 2, 0n);
  const isAirdropRewardTooLarge =
    selectedReward > 0n && selectedReward > treasuryBalance;
  const isAirdropAllowanceInsufficient =
    selectedReward > 0n && selectedReward > treasuryDistributorAllowance;
  const isAirdropUnavailable =
    isAirdropRewardTooLarge || isAirdropAllowanceInsufficient;

  const lockReadCount = Number(lockCount > 8n ? 8n : lockCount);
  const lockContracts = useMemo(
    () =>
      Array.from({ length: lockReadCount }, (_, id) => ({
        address: contractAddresses.tokenLocker,
        abi: tokenLockerAbi,
        functionName: "getLockInfo",
        args: [account, BigInt(id)] as const,
        chainId: sepoliaChain.id,
      })),
    [account, lockReadCount],
  );

  const {
    data: locksData,
    refetch: refetchLocks,
  } = useReadContracts({
    allowFailure: true,
    contracts: lockContracts,
    query: {
      enabled: Boolean(address) && lockReadCount > 0,
      refetchInterval: 5_000,
    },
  });

  const locks = useMemo<LockRecord[]>(() => {
    return Array.from({ length: lockReadCount }, (_, id) => {
      const result = readResult<readonly [bigint, bigint, boolean]>(
        locksData,
        id,
        [0n, 0n, false],
      );

      return {
        id,
        amount: result[0],
        unlockTime: result[1],
        isReleased: result[2],
      };
    });
  }, [lockReadCount, locksData]);

  const stakeInputWei = useMemo(
    () => parseTokenInput(stakeAmount),
    [stakeAmount],
  );
  const lockInputWei = useMemo(() => parseTokenInput(lockAmount), [lockAmount]);
  const needsStakeApproval =
    stakeInputWei !== null && stakingAllowance < stakeInputWei;
  const needsLockApproval = lockInputWei !== null && lockerAllowance < lockInputWei;
  const txBusy = isWalletPending || isConfirming;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowAppLoader(false);
    }, 720);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isConfirmed || !pendingHash) return;

    const timer = window.setTimeout(() => {
      setNotice(`${pendingLabel} confirmed.`);
      setPendingHash(undefined);
      void refetchDashboard();
      void refetchAirdrop();
      void refetchLocks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    isConfirmed,
    pendingHash,
    pendingLabel,
    refetchAirdrop,
    refetchDashboard,
    refetchLocks,
  ]);

  async function runTransaction(label: string, action: () => Promise<Hash>) {
    if (!address) {
      setNotice("Connect a wallet first.");
      return;
    }

    if (isWrongNetwork) {
      setNotice("Switch MetaMask to Sepolia network.");
      return;
    }

    try {
      setPendingLabel(label);
      setNotice(`${label}: waiting for wallet signature.`);
      const hash = await action();
      setPendingHash(hash);
      setNotice(`${label}: submitted ${hash.slice(0, 10)}...`);
    } catch (error) {
      setNotice(getErrorMessage(error));
    }
  }

  function requireTokenAmount(value: string, label: string) {
    const amount = parseTokenInput(value);
    if (amount === null) {
      throw new Error(`Enter a valid ${label} amount.`);
    }

    return amount;
  }

  function renderOverview() {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel title="Protocol Snapshot" eyebrow="Sepolia deployment" icon={BarChart3}>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Wallet Balance"
                value={<TokenValue value={formatToken(tokenBalance)} />}
                detail={isConnected ? "Available in connected wallet" : "Connect wallet to sync balance"}
                icon={Wallet}
              />
              <StatCard
                label="Total Staked"
                value={<TokenValue value={formatToken(totalStaked)} />}
                detail={`${formatToken(rewardRate)} points/sec pool rate`}
                icon={Vault}
                tone="cyan"
              />
              <StatCard
                label="Treasury"
                value={<TokenValue value={formatToken(treasuryBalance)} />}
                detail="Airdrop reserve"
                icon={Archive}
                tone="amber"
              />
              <StatCard
                label="Supply"
                value={<TokenValue value={formatToken(totalSupply)} />}
                detail={`Burn ${formatBps(currentBurnRate)}`}
                icon={Flame}
                tone="rose"
              />
            </div>
          </Panel>

          <Panel title="Account State" eyebrow="Live wallet" icon={Wallet}>
            <div className="space-y-3">
              {[
                ["Launch", tradingOpen ? "Open" : "Closed", tradingOpen ? "Ready for staking, locking, and claims." : "Admin has not opened trading yet."],
                ["Token", isPaused ? "Paused" : "Active", isPaused ? "Transactions are temporarily paused." : "Transfers and app actions are available."],
              ].map(([label, value, detail]) => (
                <div
                  className="rounded-xl bg-black/20 p-4"
                  key={label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                    <span
                      className={cx(
                        "rounded-md px-3 py-1 text-sm font-semibold",
                        value === "Paused" || value === "Closed"
                          ? "bg-amber-300/12 text-amber-100"
                          : "bg-violet-300/15 text-violet-100",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard
                  label="Staked"
                  value={<TokenValue value={formatToken(stakedAmount)} />}
                  detail="Personal vault"
                  tone="cyan"
                />
                <StatCard
                  label="Current Points"
                  value={formatToken(currentPoints)}
                  detail={`Epoch ${currentSnapshotId.toString()}`}
                  tone="emerald"
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  function renderStaking() {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Stake VLT" eyebrow="Vault actions" icon={Vault}>
          <div className="space-y-4">
            <Field label="Stake amount">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300"
                inputMode="decimal"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
              />
            </Field>
            <ActionButton
              className="w-full"
              icon={needsStakeApproval ? ShieldCheck : Coins}
              disabled={
                !address ||
                !stakeInputWei ||
                !tradingOpen ||
                (isPaused && !isAdmin) ||
                txBusy
              }
              onClick={() =>
                void runTransaction(
                  needsStakeApproval ? "Approve staking vault" : "Stake VLT",
                  async () => {
                    const amount = requireTokenAmount(stakeAmount, "stake");
                    if (stakingAllowance < amount) {
                      return writeContractAsync({
                        address: contractAddresses.launchToken,
                        abi: launchTokenAbi,
                        functionName: "approve",
                        args: [contractAddresses.stakingVault, amount],
                      });
                    }

                    return writeContractAsync({
                      address: contractAddresses.stakingVault,
                      abi: stakingVaultAbi,
                      functionName: "stake",
                      args: [amount],
                    });
                  },
                )
              }
            >
              {needsStakeApproval ? "Approve Vault" : "Stake VLT"}
            </ActionButton>

            <div className="h-px bg-white/10" />

            <Field label="Unstake amount">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300"
                inputMode="decimal"
                placeholder="0.0"
                value={unstakeAmount}
                onChange={(event) => setUnstakeAmount(event.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton
                variant="secondary"
                icon={ArrowDownToLine}
                disabled={!address || (isPaused && !isAdmin) || txBusy}
                onClick={() =>
                  void runTransaction("Unstake VLT", async () => {
                    const amount = requireTokenAmount(unstakeAmount, "unstake");
                    if (amount > stakedAmount) {
                      throw new Error("Unstake amount is above your stake.");
                    }

                    return writeContractAsync({
                      address: contractAddresses.stakingVault,
                      abi: stakingVaultAbi,
                      functionName: "unstake",
                      args: [amount],
                    });
                  })
                }
              >
                Unstake
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon={Sparkles}
                disabled={!address || pendingRewards === 0n || txBusy}
                onClick={() =>
                  void runTransaction("Claim staking rewards", () =>
                    writeContractAsync({
                      address: contractAddresses.stakingVault,
                      abi: stakingVaultAbi,
                      functionName: "claimRewards",
                    }),
                  )
                }
              >
                Claim Points
              </ActionButton>
            </div>
          </div>
        </Panel>

        <Panel title="Position" eyebrow="Vault stats" icon={BarChart3}>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Wallet"
              value={<TokenValue value={formatToken(tokenBalance)} />}
              detail={
                <span className="inline-flex items-center gap-1.5">
                  Approved <TokenValue value={formatToken(stakingAllowance)} />
                </span>
              }
              icon={Wallet}
            />
            <StatCard
              label="Staked"
              value={<TokenValue value={formatToken(stakedAmount)} />}
              detail={
                <span className="inline-flex items-center gap-1.5">
                  <TokenValue value={formatToken(totalStaked)} /> pool TVL
                </span>
              }
              icon={Vault}
              tone="cyan"
            />
            <StatCard
              label="Pending"
              value={formatToken(pendingRewards)}
              detail={`${formatToken(unclaimedStoredRewards)} stored`}
              icon={TimerReset}
              tone="amber"
            />
            <StatCard
              label="Points"
              value={formatToken(currentPoints)}
              detail={`Snapshot ${currentSnapshotId.toString()}`}
              icon={Sparkles}
              tone="emerald"
            />
          </div>
        </Panel>
      </div>
    );
  }

  function renderAirdrop() {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Claim Portal" eyebrow="Snapshot rewards" icon={Gift}>
          <div className="space-y-4">
            <Field label="Snapshot ID">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300"
                inputMode="numeric"
                placeholder="0"
                value={snapshotId}
                onChange={(event) => setSnapshotId(event.target.value)}
              />
            </Field>
            <ActionButton
              className="w-full"
              icon={Gift}
              disabled={
                !address ||
                selectedSnapshot === null ||
                selectedReward === 0n ||
                isAirdropUnavailable ||
                selectedClaimed ||
                txBusy
              }
              onClick={() =>
                void runTransaction("Claim airdrop", async () => {
                  const parsedSnapshot = parseSnapshotInput(snapshotId);
                  if (parsedSnapshot === null) {
                    throw new Error("Enter a valid snapshot ID.");
                  }

                  return writeContractAsync({
                    address: contractAddresses.airdropDistributor,
                    abi: airdropDistributorAbi,
                    functionName: "claim",
                    args: [parsedSnapshot],
                  });
                })
              }
            >
              Claim Token
            </ActionButton>
          </div>
        </Panel>

        <Panel title="Airdrop State" eyebrow="Distributor" icon={Sparkles}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Snapshot Points"
              value={formatToken(selectedPoints)}
              detail={`Epoch ${snapshotId || "0"}`}
              icon={Sparkles}
              tone="cyan"
            />
            <StatCard
              label="Reward"
              value={<TokenValue value={formatCompactToken(selectedReward)} />}
              icon={Gift}
              detail={
                isAirdropRewardTooLarge
                  ? "Exceeds Treasury. Redeploy after contract fix."
                  : isAirdropAllowanceInsufficient
                    ? "Treasury allowance too low. Admin must re-approve."
                    : selectedClaimed
                      ? "Claimed"
                      : "Available check"
              }
              tone={
                selectedClaimed || isAirdropUnavailable ? "rose" : "emerald"
              }
            />
            <StatCard
              label="Current Epoch"
              value={currentSnapshotId.toString()}
              detail={`${formatToken(currentPoints)} active points`}
              icon={RefreshCw}
              tone="amber"
            />
          </div>
        </Panel>
      </div>
    );
  }

  function renderLocker() {
    return (
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Token Locker" eyebrow="Time locks" icon={Lock}>
          <div className="space-y-4">
            <Field label="Lock amount">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300"
                inputMode="decimal"
                placeholder="0.0"
                value={lockAmount}
                onChange={(event) => setLockAmount(event.target.value)}
              />
            </Field>
            <Field label="Duration">
              <div className="grid grid-cols-4 gap-2">
                {lockDurations.map((option) => (
                  <button
                    className={cx(
                      "min-h-10 rounded-md border px-3 text-sm font-semibold transition",
                      lockDuration === option.value
                        ? "border-violet-300 bg-violet-300 text-violet-950"
                        : "border-white/10 bg-black/30 text-slate-200 hover:bg-white/10",
                    )}
                    key={option.value}
                    type="button"
                    onClick={() => setLockDuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
            <ActionButton
              className="w-full"
              icon={needsLockApproval ? ShieldCheck : Lock}
              disabled={
                !address ||
                !lockInputWei ||
                !tradingOpen ||
                (isPaused && !isAdmin) ||
                txBusy
              }
              onClick={() =>
                void runTransaction(
                  needsLockApproval ? "Approve token locker" : "Lock VLT",
                  async () => {
                    const amount = requireTokenAmount(lockAmount, "lock");
                    if (lockerAllowance < amount) {
                      return writeContractAsync({
                        address: contractAddresses.launchToken,
                        abi: launchTokenAbi,
                        functionName: "approve",
                        args: [contractAddresses.tokenLocker, amount],
                      });
                    }

                    return writeContractAsync({
                      address: contractAddresses.tokenLocker,
                      abi: tokenLockerAbi,
                      functionName: "lock",
                      args: [amount, BigInt(Number(lockDuration) * 86_400)],
                    });
                  },
                )
              }
            >
              {needsLockApproval ? "Approve Locker" : "Lock VLT"}
            </ActionButton>
          </div>
        </Panel>

        <Panel
          title="Locks"
          icon={Archive}
          eyebrow={
            lockCount > BigInt(locks.length)
              ? `showing ${locks.length}/${lockCount.toString()} records`
              : `${lockCount.toString()} records`
          }
        >
          {locks.length === 0 ? (
            <div className="rounded-xl bg-black/20 p-5 text-sm text-slate-300">
              No locks for this wallet.
            </div>
          ) : (
            <div className="space-y-3">
              {locks.map((lock) => {
                const remaining = secondsUntil(lock.unlockTime, now);
                const ready = remaining === 0 && !lock.isReleased;
                const maxLockWindowSeconds = 365 * 86_400;
                const progress = ready
                  ? 100
                  : Math.max(
                    8,
                    100 - Math.min(92, (remaining / maxLockWindowSeconds) * 92),
                  );

                return (
                  <div
                    className="rounded-xl bg-black/20 p-4"
                    key={lock.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-400">
                          Lock #{lock.id}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          <TokenValue value={formatToken(lock.amount)} />
                        </p>
                        <p className="text-sm text-slate-400">
                          {lock.isReleased
                            ? "Released"
                            : `${formatDuration(remaining)} - ${new Date(
                              Number(lock.unlockTime) * 1000,
                            ).toLocaleDateString()}`}
                        </p>
                      </div>
                      <ActionButton
                        variant={ready ? "primary" : "secondary"}
                        icon={Unlock}
                        disabled={!ready || txBusy}
                        onClick={() =>
                          void runTransaction(`Unlock #${lock.id}`, () =>
                            writeContractAsync({
                              address: contractAddresses.tokenLocker,
                              abi: tokenLockerAbi,
                              functionName: "unlock",
                              args: [BigInt(lock.id)],
                            }),
                          )
                        }
                      >
                        Unlock
                      </ActionButton>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-md bg-white/10">
                      <div
                        className={cx(
                          "h-full rounded-md",
                          lock.isReleased ? "bg-slate-500" : "bg-violet-300",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  function renderAdmin() {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Admin Controls" eyebrow="Role gated" icon={UserCog}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton
                icon={PlayCircle}
                disabled={!address || !isAdmin || tradingOpen || txBusy}
                onClick={() =>
                  void runTransaction("Open trading", () =>
                    writeContractAsync({
                      address: contractAddresses.launchToken,
                      abi: launchTokenAbi,
                      functionName: "openTrading",
                    }),
                  )
                }
              >
                {tradingOpen ? "Trading Open" : "Open Trading"}
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon={RefreshCw}
                disabled={!address || !isAdmin || txBusy}
                onClick={() =>
                  void runTransaction("Create snapshot", () =>
                    writeContractAsync({
                      address: contractAddresses.airdropPoints,
                      abi: airdropPointsAbi,
                      functionName: "snapshot",
                    }),
                  )
                }
              >
                Snapshot
              </ActionButton>
            </div>
            <Field label="Auto burn (%)">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300"
                  inputMode="decimal"
                  max="10"
                  min="0"
                  placeholder="0"
                  value={burnRate}
                  onChange={(event) => setBurnRate(event.target.value)}
                />
                <ActionButton
                  variant="secondary"
                  icon={Flame}
                  disabled={!address || !isAdmin || txBusy}
                  onClick={() =>
                    void runTransaction("Set burn rate", async () => {
                      const parsed = parseBurnInput(burnRate);
                      if (parsed === null) {
                        throw new Error("Burn rate must be between 0 and 10.");
                      }

                      return writeContractAsync({
                        address: contractAddresses.launchToken,
                        abi: launchTokenAbi,
                        functionName: "setBurnRate",
                        args: [parsed],
                      });
                    })
                  }
                >
                  Apply
                </ActionButton>
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton
                variant="danger"
                icon={PauseCircle}
                disabled={!address || !isAdmin || isPaused || txBusy}
                onClick={() =>
                  void runTransaction("Pause token", () =>
                    writeContractAsync({
                      address: contractAddresses.launchToken,
                      abi: launchTokenAbi,
                      functionName: "pause",
                    }),
                  )
                }
              >
                Pause
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon={PlayCircle}
                disabled={!address || !isAdmin || !isPaused || txBusy}
                onClick={() =>
                  void runTransaction("Unpause token", () =>
                    writeContractAsync({
                      address: contractAddresses.launchToken,
                      abi: launchTokenAbi,
                      functionName: "unpause",
                    }),
                  )
                }
              >
                Unpause
              </ActionButton>
            </div>
          </div>
        </Panel>

        <Panel title="System Status" eyebrow="Access Manager" icon={ShieldCheck}>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Wallet Role"
              value={isAdmin ? "Admin" : "User"}
              detail={formatAddress(address)}
              icon={UserCog}
              tone={isAdmin ? "emerald" : "cyan"}
            />
            <StatCard
              label="Launch"
              value={tradingOpen ? "Open" : "Closed"}
              detail={isPaused ? "Paused" : "Token active"}
              icon={tradingOpen ? PlayCircle : PauseCircle}
              tone={tradingOpen ? "emerald" : "amber"}
            />
            <StatCard
              label="Treasury"
              value={<TokenValue value={formatToken(treasuryBalance)} />}
              detail={formatFullAddress(contractAddresses.treasury)}
              icon={Vault}
              tone="amber"
            />
            <StatCard
              label="Burn Rate"
              value={formatBps(currentBurnRate)}
              detail="Max 10%"
              icon={Flame}
              tone="rose"
            />
          </div>
        </Panel>
      </div>
    );
  }

  const viewContent = {
    overview: renderOverview,
    staking: renderStaking,
    airdrop: renderAirdrop,
    locker: renderLocker,
    admin: renderAdmin,
  }[activeView];

  function renderConsoleContent() {
    return (
      <div className="flex flex-col gap-6 pb-20">

        <div className="rounded-2xl bg-[#101522]/72 p-3 soft-card ring-1 ring-white/[0.04] backdrop-blur-md">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:flex">
              {navigation.map((item) => {
                const Icon = item.icon;
                const href =
                  item.id === "overview" ? "/console" : `/console/${item.id}`;
                return (
                  <Link
                    href={href}
                    className={cx(
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
                      activeView === item.id
                        ? "bg-violet-950 text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.18)]"
                        : "bg-black/15 text-slate-300 hover:bg-violet-950/20 hover:text-white",
                    )}
                    key={item.id}
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="min-h-11 max-w-full rounded-lg bg-black/20 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/[0.04] sm:max-w-[360px]">
                <span className="block truncate">
                  {isDashboardLoading ? "Syncing contract reads..." : notice}
                </span>
              </div>
              <ConnectButton />
            </div>
          </div>
        </div>

        {viewContent()}
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-100">
      <AppBackdrop farStars={farStars} midStars={midStars} nearStars={nearStars} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <TopBar />
        {appMode === "home" ? (
          <HomeContent />
        ) : appMode === "about" ? (
          <AboutContent />
        ) : (
          renderConsoleContent()
        )}
      </div>

      {showAppLoader ? <AppLoader /> : null}
    </main>
  );
}

