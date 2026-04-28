"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  BarChart3,
  Coins,
  Flame,
  Gift,
  HomeIcon,
  Info,
  Layers3,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Unlock,
  UserCog,
  Users,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SiEthereum } from "react-icons/si";
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
  hardhatChain,
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
  VltLogo,
  cx,
} from "./ui";

type ViewId = "overview" | "staking" | "airdrop" | "locker" | "admin";
type AppMode = "home" | "console" | "about";

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

type StarPoint = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  dx: number;
  dy: number;
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

const tokenomics = [
  { label: "Initial", value: "1,000,000", detail: "Deploy supply", icon: Coins },
  { label: "Treasury", value: "200,000", detail: "Community pool", icon: Vault },
  { label: "Team lock", value: "300,000", detail: "180-day vesting", icon: Lock },
  { label: "Market", value: "500,000", detail: "Sale + seed + reserve", icon: BarChart3 },
];

const contractMap = [
  { name: "AccessManager", note: "RBAC roles", icon: ShieldCheck },
  { name: "LaunchToken", note: "ERC-20 core", icon: Coins },
  { name: "TokenLocker", note: "Time locks", icon: Lock },
  { name: "StakingVault", note: "Stake + rewards", icon: Vault },
  { name: "AirdropPoints", note: "Snapshot points", icon: Sparkles },
  { name: "Treasury", note: "Fund storage", icon: Archive },
  { name: "AirdropDistributor", note: "Claim gateway", icon: Gift },
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

function TokenUnit() {
  return (
    <SiEthereum
      aria-label="VLT"
      className="inline-block h-[0.9em] w-[0.9em] shrink-0 text-violet-200"
    />
  );
}

function TokenValue({ value }: { value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{value}</span>
      <TokenUnit />
    </span>
  );
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
  const isWrongNetwork = isConnected && chainId !== hardhatChain.id;

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
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "totalSupply",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "tradingOpen",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "burnRate",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "totalStaked",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "pendingRewards",
        args: [account],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "userInfo",
        args: [account],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.airdropPoints,
        abi: airdropPointsAbi,
        functionName: "getCurrentPoints",
        args: [account],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.airdropPoints,
        abi: airdropPointsAbi,
        functionName: "currentSnapshotId",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.tokenLocker,
        abi: tokenLockerAbi,
        functionName: "getLockCount",
        args: [account],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [account, contractAddresses.stakingVault],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [account, contractAddresses.tokenLocker],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.accessManager,
        abi: accessManagerAbi,
        functionName: "hasRole",
        args: [roles.admin, account],
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.treasury,
        abi: treasuryAbi,
        functionName: "getBalance",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "paused",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.stakingVault,
        abi: stakingVaultAbi,
        functionName: "rewardRate",
        chainId: hardhatChain.id,
      },
      {
        address: contractAddresses.launchToken,
        abi: launchTokenAbi,
        functionName: "allowance",
        args: [contractAddresses.treasury, contractAddresses.airdropDistributor],
        chainId: hardhatChain.id,
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
            chainId: hardhatChain.id,
          },
          {
            address: contractAddresses.airdropDistributor,
            abi: airdropDistributorAbi,
            functionName: "claimed",
            args: [selectedSnapshot, account],
            chainId: hardhatChain.id,
          },
          {
            address: contractAddresses.airdropPoints,
            abi: airdropPointsAbi,
            functionName: "getPoints",
            args: [account, selectedSnapshot],
            chainId: hardhatChain.id,
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
        chainId: hardhatChain.id,
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
      setNotice("Switch MetaMask to local network.");
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

  function renderTopBar() {
    return (
      <header className="sticky top-4 z-30 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#090d16]/88 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="Vault Token Logo"
            className="h-18 w-20 object-contain brightness-0 invert"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/#home-top"
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
          >
            <HomeIcon aria-hidden className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/#tokenomics"
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
          >
            <Coins aria-hidden className="h-4 w-4" />
            Tokenomics
          </Link>
          <Link
            href="/#contracts-map"
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
          >
            <Layers3 aria-hidden className="h-4 w-4" />
            7 Contracts
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
          >
            <Info aria-hidden className="h-4 w-4" />
            About
          </Link>
          <Link
            href="/console"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/50 bg-violet-950 px-3 py-2 text-sm font-semibold text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-900"
          >
            <Activity aria-hidden className="h-4 w-4" />
            Console
          </Link>
        </div>
      </header>
    );
  }

  function renderHomeContent() {
    return (
      <div className="flex flex-col gap-6 pb-20">

        <section id="home-top" className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center overflow-hidden py-16 text-center">
          <div className="light-vortex" aria-hidden>
            <span className="light-vortex__ring light-vortex__ring--outer" />
            <span className="light-vortex__ring light-vortex__ring--inner" />
            <span className="light-vortex__stream light-vortex__stream--one" />
            <span className="light-vortex__stream light-vortex__stream--two" />
          </div>
          <span className="relative z-10 mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-4 py-2 text-sm text-violet-100">
            <ShieldCheck aria-hidden className="h-4 w-4" />
            ERC-20 DeFi Ecosystem
          </span>
          <h1 className="relative z-10 max-w-5xl text-4xl font-black text-white sm:text-6xl">
            ERC-20 Token on Ethereum Sepolia
          </h1>
          <p className="relative z-10 mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            ERC-20 system with staking, airdrops, vesting, and role-based access control.
          </p>

          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/about"
              className="hero-cta-glow inline-flex min-h-12 items-center gap-2 rounded-lg border border-violet-300/60 bg-violet-950 px-7 py-3 text-sm font-semibold text-violet-100 transition hover:border-violet-200/80 hover:bg-violet-900"
            >
              <Info aria-hidden className="h-4 w-4" />
              About
            </Link>
            <Link
              href="/console"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-violet-900/90 bg-transparent px-7 py-3 text-sm font-semibold text-violet-100 transition hover:border-violet-300/70 hover:bg-violet-950/30"
            >
              <Activity aria-hidden className="h-4 w-4" />
              Open Console
            </Link>
          </div>
        </section>

        <section id="tokenomics" className="mt-10 space-y-6">
          <Panel title="Tokenomics" eyebrow={<TokenUnit />} icon={Coins}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {tokenomics.map((item) => (
                <StatCard
                  detail={item.detail}
                  icon={item.icon}
                  key={item.label}
                  label={item.label}
                  value={<TokenValue value={item.value} />}
                  tone={item.label === "Team lock" ? "amber" : "cyan"}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { label: "Symbol", value: <TokenUnit /> },
                { label: "Decimals", value: "18" },
                { label: "Cap", value: "10,000,000" },
              ].map((item) => (
                <div
                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-3"
                  key={item.label}
                >
                  <p className="text-xs uppercase text-slate-500">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section id="contracts-map" className="mt-10 space-y-6">
          <Panel title="7 Smart Contracts" eyebrow="System map" icon={Layers3}>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {contractMap.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="rounded-lg border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-violet-300/45 hover:bg-white/10"
                  >
                    <Icon aria-hidden className="h-5 w-5 text-violet-200" />
                    <p className="mt-4 text-lg font-bold text-white">{item.name}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.note}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

      </div>
    );
  }

  function renderAboutContent() {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <section className="relative z-10 py-12">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-4 py-2 text-sm text-violet-100">
              <Info aria-hidden className="h-4 w-4" />
              Đề tài nhóm
            </span>
            <h1 className="mt-6 text-4xl font-black text-white sm:text-5xl">
              VaultToken ERC-20 DeFi Ecosystem
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Dự án thiết kế và triển khai hệ thống Token ERC-20 trên Ethereum
              Sepolia, kết hợp staking, airdrop theo snapshot, khóa token theo
              thời gian, Treasury và quản trị phân quyền bằng RBAC.
            </p>
          </div>
        </section>

        <Panel title="Thành Viên Nhóm" eyebrow="Team" icon={Users}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["NAM", "Leader / AccessManager / LaunchToken"],
              ["TIN", "Treasury / TokenLocker"],
              ["HẬU", "StakingVault / kiến trúc hệ thống"],
              ["VINH", "AirdropPoints / snapshot flow"],
              ["TRÌNH", "AirdropDistributor / testing & deploy"],
            ].map(([name, role]) => (
              <div className="rounded-lg border border-white/10 bg-black/25 p-4" key={name}>
                <div className="mb-3 flex h-24 items-center justify-center rounded-md border border-dashed border-violet-300/30 bg-violet-300/[0.05] text-xs text-slate-500">
                  Ảnh thành viên
                </div>
                <p className="font-semibold text-white">{name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{role}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tổng Quan Dự Án" eyebrow="VaultToken" icon={Info}>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 text-sm leading-7 text-slate-300">
              <p>
                VaultToken là hệ thống Token ERC-20 kết hợp các chức năng DeFi
                cốt lõi: staking, tích điểm on-chain, airdrop theo snapshot,
                khóa token theo thời gian và quản lý quỹ bằng Treasury. Dự án
                triển khai trên Ethereum Sepolia để mô phỏng quy trình xây dựng
                một hệ sinh thái token có thể kiểm thử, audit và mở rộng.
              </p>
              <p>
                Kiến trúc của hệ thống được thiết kế theo hướng modular. Mỗi
                contract chỉ đảm nhận một trách nhiệm rõ ràng: token, quyền,
                staking, điểm, khóa token, quỹ và phân phối. Cách chia này giúp
                giảm coupling giữa các module, tránh việc một contract giữ quá
                nhiều logic, đồng thời làm cho test case và audit bảo mật rõ ràng
                hơn.
              </p>
              <p>
                Về mặt nghiệp vụ, admin chuẩn bị hệ thống bằng cách mint token,
                mở trading, nạp quỹ vào Treasury, cấp allowance cho Distributor
                và tạo snapshot. Người dùng sau khi hệ thống launch có thể stake,
                unlock, claim reward và claim airdrop theo điểm đã ghi nhận.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Network", value: "Ethereum Sepolia" },
                { label: "Token", value: <span className="inline-flex items-center gap-1.5">VaultToken <TokenUnit /></span> },
                { label: "Decimals", value: "18" },
                { label: "Contracts", value: "7 modules" },
                { label: "Initial Supply", value: <TokenValue value="1,000,000" /> },
                { label: "Max Supply", value: <TokenValue value="10,000,000" /> },
                { label: "Stack", value: "Solidity, Hardhat, OpenZeppelin" },
                { label: "Frontend", value: "Next.js, Viem, Wagmi, MetaMask" },
              ].map((item) => (
                <div
                  className="rounded-lg border border-violet-300/18 bg-violet-300/[0.06] px-4 py-3"
                  key={item.label}
                >
                  <p className="text-xs uppercase text-slate-500">{item.label}</p>
                  <p className="mt-1 font-semibold text-violet-100">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Role Và Quyền Hạn" eyebrow="AccessManager RBAC" icon={ShieldCheck}>
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              ["ADMIN_ROLE", "Quyền cao nhất", "grantRole, revokeRole, openTrading, snapshot, withdraw Treasury, approveSpender cho Distributor."],
              ["MINTER_ROLE", "Quyền phát hành token", "Gọi mint(address, amount) trên LaunchToken, bị giới hạn bởi max supply/cap."],
              ["VAULT_ROLE", "Quyền hệ thống đặc biệt", "Cho phép StakingVault gọi addPoints trên AirdropPoints để ghi điểm cho user."],
              ["USER", "Người dùng phổ thông", "transfer, approve, burn, stake, unstake, lock, unlock, claim reward và claim airdrop."],
            ].map(([role, title, detail]) => (
              <div className="rounded-lg border border-violet-300/15 bg-black/25 p-5" key={role}>
                <p className="text-xs font-semibold uppercase text-violet-200">{role}</p>
                <h3 className="mt-2 font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-semibold text-white">Sơ đồ phân quyền</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              <div className="rounded-lg border border-violet-300/20 bg-violet-300/[0.08] p-4 text-center text-sm font-semibold text-violet-100">ADMIN_ROLE</div>
              <div className="hidden text-slate-500 md:block">→</div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-center text-sm text-slate-200">grantRole / revokeRole</div>
              <div className="hidden text-slate-500 md:block">→</div>
              <div className="rounded-lg border border-violet-300/20 bg-violet-300/[0.08] p-4 text-center text-sm font-semibold text-violet-100">MINTER_ROLE / VAULT_ROLE</div>
            </div>
          </div>
        </Panel>

        <Panel title="Sơ Đồ Kiến Trúc Contract" eyebrow="Diagram from docs" icon={Layers3}>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {[
                ["Core", "AccessManager + LaunchToken", "Nền tảng quyền và token ERC-20 chính."],
                ["Feature", "TokenLocker + StakingVault + AirdropPoints", "Các chức năng người dùng: lock, stake, điểm snapshot."],
                ["Fund", "Treasury", "Két token, chỉ giữ tài sản và cấp allowance."],
                ["Distribution", "AirdropDistributor", "Phân phối token dựa trên điểm snapshot."],
              ].map(([layer, modules, detail]) => (
                <div className="rounded-lg border border-white/10 bg-black/25 p-4" key={layer}>
                  <p className="text-xs font-semibold uppercase text-violet-200">{layer}</p>
                  <p className="mt-1 font-semibold text-white">{modules}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-violet-300/15 bg-violet-300/[0.04] p-5">
              <div className="grid gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center text-white">AccessManager</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-center text-slate-200">LaunchToken</div>
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-center text-slate-200">Treasury</div>
                  <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-center text-slate-200">AirdropPoints</div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center text-slate-300">TokenLocker</div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center text-slate-300">StakingVault</div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center text-slate-300">AirdropDistributor</div>
                </div>
                <p className="text-center text-xs leading-5 text-slate-500">
                  AccessManager kiểm tra role. LaunchToken là tài sản trung tâm.
                  StakingVault ghi điểm vào AirdropPoints. Distributor rút token
                  từ Treasury qua allowance.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Chi Tiết 7 Smart Contract" eyebrow="Contract responsibilities" icon={Layers3}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["AccessManager", "Quản lý role toàn hệ thống bằng RBAC. Admin cấp hoặc thu hồi role, các contract khác gọi hasRole để kiểm tra quyền trước khi chạy hành động đặc quyền."],
              ["LaunchToken", "Token ERC-20 chính của hệ thống. Kiểm soát openTrading, mint theo MINTER_ROLE, burn bởi user, transfer sau launch và burnRate khi cần."],
              ["TokenLocker", "Khóa token theo thời gian. Mỗi user có thể có nhiều lock, chỉ unlock được khi hết hạn, dùng cho vesting team hoặc các kịch bản khóa token."],
              ["StakingVault", "Nhận token stake, cập nhật reward bằng accRewardPerToken, hỗ trợ unstake, claimRewards, emergencyWithdraw và gọi AirdropPoints để cộng điểm."],
              ["AirdropPoints", "Không giữ token, chỉ accounting điểm. Có snapshotId để chốt điểm từng epoch. addPoints chỉ được gọi bởi contract có VAULT_ROLE."],
              ["Treasury", "Quản lý quỹ token. Admin có thể deposit, withdraw và approveSpender cho Distributor. Treasury không chứa logic airdrop/staking."],
              ["AirdropDistributor", "Claim gateway. Đọc điểm theo snapshot, kiểm tra claimed, tính reward, dùng transferFrom từ Treasury và chống double claim."],
            ].map(([name, detail]) => (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5" key={name}>
                <p className="font-semibold text-white">{name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Luồng User" eyebrow="Activity flow" icon={Activity}>
          <div className="grid gap-3 md:grid-cols-4">
            {["Start", "System launched?", "Choose action", "End"].map((step) => (
              <div className="rounded-lg border border-violet-300/15 bg-violet-300/[0.05] p-4 text-center text-sm font-semibold text-violet-100" key={step}>{step}</div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Stake", "Stake token → transfer vào Vault → update reward → add points → kết thúc."],
              ["Unstake", "Unstake token → transfer về user → update reward → kết thúc."],
              ["Claim reward", "Claim reward → transfer reward về user."],
              ["Claim airdrop", "Call claim → đọc snapshot + points → kiểm tra claimed → tính reward → kiểm tra Treasury → transfer token → mark claimed."],
              ["Lock / Unlock", "Lock token lưu thông tin khóa. Unlock kiểm tra thời gian, nếu chưa tới hạn thì revert, nếu đủ hạn thì trả token."],
              ["Emergency withdraw", "Rút vốn khẩn cấp khỏi StakingVault, reset reward về 0 và chỉ trả lại vốn gốc."],
            ].map(([name, detail]) => (
              <div className="rounded-lg border border-white/10 bg-black/25 p-5" key={name}>
                <p className="font-semibold text-white">{name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Luồng Admin Và Thứ Tự Deploy" eyebrow="Operations" icon={UserCog}>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/25 p-5">
              <h3 className="font-semibold text-white">Admin Flow</h3>
              <div className="mt-4 space-y-3">
                {["Mint token", "Open trading", "Trigger snapshot", "Deposit Treasury", "Approve Distributor", "Withdraw fund khi cần"].map((step, index) => (
                  <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3" key={step}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-950 text-xs font-semibold text-violet-100">{index + 1}</span>
                    <span className="text-sm text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-5">
              <h3 className="font-semibold text-white">Deploy Order</h3>
              <div className="mt-4 space-y-3">
                {["AccessManager", "LaunchToken", "TokenLocker / StakingVault / AirdropPoints / Treasury", "AirdropDistributor", "Grant roles: VAULT_ROLE, MINTER_ROLE"].map((step, index) => (
                  <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3" key={step}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-950 text-xs font-semibold text-violet-100">{index + 1}</span>
                    <span className="text-sm text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Tokenomics Và Phân Bổ" eyebrow="Supply model" icon={Coins}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Team/Dev", "30%", "300,000", "Khóa 180 ngày"],
              ["Public Sale", "20%", "200,000", "Không khóa"],
              ["Seed / Series A", "20%", "200,000", "Theo thỏa thuận"],
              ["Community", "20%", "200,000", "Airdrop + staking"],
              ["Reserve", "10%", "100,000", "Dự phòng"],
            ].map(([name, percent, amount, detail]) => (
              <div className="rounded-lg border border-white/10 bg-black/25 p-5" key={name}>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="mt-2 text-2xl font-bold text-violet-100">{percent}</p>
                <p className="mt-2 text-sm text-slate-300"><TokenValue value={amount} /></p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Bảo Mật, Ràng Buộc Và Rủi Ro" eyebrow="Invariants & mitigation" icon={ShieldCheck}>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold text-white">Invariants</h3>
              <div className="grid gap-3">
                {[
                  "Một user chỉ được claim một lần trên mỗi snapshot.",
                  "Tổng reward claim không được vượt quá số dư Treasury.",
                  "Không được stake, lock hoặc transfer trước khi launch.",
                  "Emergency withdraw phải reset trạng thái reward.",
                  "Allowance phải được quản lý an toàn để tránh race condition.",
                  "Snapshot isolation: mỗi đợt airdrop độc lập theo snapshotId.",
                ].map((item) => (
                  <div className="rounded-lg border border-violet-300/15 bg-violet-300/[0.05] p-4 text-sm leading-6 text-slate-300" key={item}>{item}</div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 font-semibold text-white">Risks & Mitigation</h3>
              <div className="grid gap-3">
                {[
                  ["Double claim", "Dùng mapping claimed[snapshotId][user]."],
                  ["Thiếu thanh khoản Treasury", "Kiểm tra balance trước khi transfer."],
                  ["Approve race condition", "Reset allowance hoặc dùng tăng allowance có kiểm soát."],
                  ["Reentrancy", "Dùng ReentrancyGuard cho StakingVault và AirdropDistributor."],
                  ["Admin abuse", "Khuyến nghị multisig hoặc timelock khi production."],
                ].map(([risk, fix]) => (
                  <div className="rounded-lg border border-white/10 bg-black/25 p-4" key={risk}>
                    <p className="text-sm font-semibold text-white">{risk}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  function renderOverview() {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel title="Protocol Snapshot" eyebrow="Local deployment" icon={BarChart3}>
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
                  className="rounded-lg border border-white/10 bg-black/25 p-4"
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
            <div className="rounded-lg border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
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
                    className="rounded-lg border border-white/10 bg-black/20 p-4"
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

        <div className="rounded-xl border border-white/10 bg-[#101522]/88 p-3 soft-card backdrop-blur-md">
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
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition",
                      activeView === item.id
                        ? "border-violet-300/60 bg-violet-950 text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.18)]"
                        : "border-white/10 bg-black/20 text-slate-300 hover:border-violet-300/30 hover:bg-violet-950/20 hover:text-white",
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
              <div className="min-h-11 max-w-full rounded-lg border border-white/10 bg-black/25 px-4 py-2 text-sm text-slate-300 sm:max-w-[360px]">
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
      <div className="pointer-events-none fixed inset-0 z-0 bg-black" />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {farStars.map((star, index) => (
          <span
            key={`far-${star.left}-${star.top}-${index}`}
            className="home-star home-star--far"
            style={{
              left: `${star.left}%`, top: `${star.top}%`,
              width: `${star.size}px`, height: `${star.size}px`,
              animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s`,
              "--dx": `${star.dx}vw`, "--dy": `${star.dy}vh`,
            } as CSSProperties}
          />
        ))}
        {midStars.map((star, index) => (
          <span
            key={`mid-${star.left}-${star.top}-${index}`}
            className="home-star home-star--mid"
            style={{
              left: `${star.left}%`, top: `${star.top}%`,
              width: `${star.size}px`, height: `${star.size}px`,
              animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s`,
              "--dx": `${star.dx}vw`, "--dy": `${star.dy}vh`,
            } as CSSProperties}
          />
        ))}
        {nearStars.map((star, index) => (
          <span
            key={`near-${star.left}-${star.top}-${index}`}
            className="home-star home-star--near"
            style={{
              left: `${star.left}%`, top: `${star.top}%`,
              width: `${star.size}px`, height: `${star.size}px`,
              animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s`,
              "--dx": `${star.dx}vw`, "--dy": `${star.dy}vh`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        {renderTopBar()}
        {appMode === "home"
          ? renderHomeContent()
          : appMode === "about"
            ? renderAboutContent()
            : renderConsoleContent()}
      </div>

      {showAppLoader ? (
        <div className="app-loader fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="app-loader__orb" />
            <div className="text-center">
              <p className="text-sm font-semibold text-violet-100">
                Loading VaultToken
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Preparing interface...
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

