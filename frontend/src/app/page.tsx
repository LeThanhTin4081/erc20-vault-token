"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
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
  hardhatChain,
  launchTokenAbi,
  roles,
  stakingVaultAbi,
  tokenLockerAbi,
  treasuryAbi,
} from "@/lib/contracts";

type ViewId = "overview" | "staking" | "airdrop" | "locker" | "admin";
type AppMode = "home" | "console";

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

const navigation: Array<{ id: ViewId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "staking", label: "Staking" },
  { id: "airdrop", label: "Airdrop" },
  { id: "locker", label: "Locker" },
  { id: "admin", label: "Admin" },
];

const tokenomics = [
  { label: "Initial Supply", value: "1,000,000 VLT", detail: "Minted at deploy" },
  { label: "Treasury Reserve", value: "200,000 VLT", detail: "Airdrop community pool" },
  { label: "Team Lock", value: "300,000 VLT", detail: "180-day token locker vesting" },
  { label: "Public + Seed + Reserve", value: "500,000 VLT", detail: "200k + 200k + 100k" },
];

const contractMap = [
  { name: "AccessManager", note: "Trái tim của hệ thống phân quyền (RBAC). Quản lý các vai trò Admin, Minter, Vault." },
  { name: "LaunchToken", note: "Token ERC-20 gốc (VLT). Hỗ trợ Mint, Burn, Tạm dừng và chặn giao dịch trước khi Launch." },
  { name: "TokenLocker", note: "Khóa Token theo thời gian (Vesting) dành cho Team, Dev và Quỹ đầu tư." },
  { name: "StakingVault", note: "Nhận VLT stake từ người dùng và tính lãi tĩnh dưới dạng Điểm Airdrop." },
  { name: "AirdropPoints", note: "Sổ cái lưu trữ điểm thưởng theo đợt (Snapshot). Đảm bảo tính bất biến." },
  { name: "Treasury", note: "Két sắt an toàn của dự án. Chỉ giữ Token quỹ và cấp định mức (allowance) chi tiêu." },
  { name: "AirdropDistributor", note: "Nơi người dùng Claim thưởng Airdrop. Tự động đối chiếu điểm và chống nhận 2 lần." },
];

const lockDurations = [
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "180D", value: "180" },
  { label: "365D", value: "365" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
    }).format(numberValue)} VLT`;
  }

  return `${formatToken(value)} VLT`;
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

function ActionButton({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-violet-300/70 disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-slate-500 disabled:opacity-100 disabled:hover:bg-white/[0.04]",
        variant === "primary" &&
          "border-violet-200/35 bg-violet-500 text-violet-50 hover:bg-violet-400",
        variant === "secondary" &&
          "border-white/18 bg-white/[0.08] text-slate-100 hover:bg-white/[0.14]",
        variant === "danger" &&
          "border-rose-300/35 bg-rose-400 text-rose-950 hover:bg-rose-300",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-white/12 bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100/70">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = "emerald",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "emerald" | "cyan" | "amber" | "rose";
}) {
  const tones = {
    emerald:
      "border-emerald-200/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.16),rgba(16,185,129,0.07))]",
    cyan: "border-violet-200/20 bg-[linear-gradient(145deg,rgba(167,139,250,0.16),rgba(167,139,250,0.07))]",
    amber:
      "border-amber-200/20 bg-[linear-gradient(145deg,rgba(251,191,36,0.16),rgba(251,191,36,0.07))]",
    rose: "border-rose-200/20 bg-[linear-gradient(145deg,rgba(251,113,133,0.16),rgba(251,113,133,0.07))]",
  };

  return (
    <div className={cx("min-w-0 rounded-xl border p-4", tones[tone])}>
      <p className="text-sm text-slate-200">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold leading-tight text-white md:text-3xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 break-words text-sm text-slate-300/85">{detail}</p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}

function VltLogo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white shadow-[0_10px_30px_rgba(255,255,255,0.16)]"
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        fill="none"
      >
        <rect x="5" y="5" width="12" height="22" rx="4" fill="#05060f" />
        <rect x="16" y="15" width="11" height="12" rx="4" fill="#05060f" />
        <path
          d="M18 6h8v8h-2.8V10.8L18 16V6Z"
          fill="#05060f"
        />
      </svg>
    </span>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const account = address ?? zeroAddress;
  const isWrongNetwork = isConnected && chainId !== hardhatChain.id;

  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [appMode, setAppMode] = useState<AppMode>("home");
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [snapshotId, setSnapshotId] = useState("0");
  const [lockAmount, setLockAmount] = useState("");
  const [lockDuration, setLockDuration] = useState("30");
  const [burnRate, setBurnRate] = useState("0");
  const [notice, setNotice] = useState("Ready.");
  const [pendingHash, setPendingHash] = useState<Hash>();
  const [pendingLabel, setPendingLabel] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
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

  function jumpHomeSection(id: string) {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function goHomeAndJump(id: string) {
    setAppMode("home");
    window.setTimeout(() => jumpHomeSection(id), 60);
  }

  function renderTopBar() {
    return (
      <header className="sticky top-4 z-30 flex items-center justify-between rounded-2xl border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <VltLogo size={40} />
          <p className="text-2xl font-black leading-none tracking-tight text-white sm:text-4xl">
            VAULT TOKEN
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              appMode === "home"
                ? jumpHomeSection("home-top")
                : goHomeAndJump("home-top")
            }
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/12"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => goHomeAndJump("tokenomics")}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/12"
          >
            Tokenomics
          </button>
          <button
            type="button"
            onClick={() => goHomeAndJump("contracts-map")}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/12"
          >
            7 Contracts
          </button>
          <button
            type="button"
            onClick={() => setAppMode("console")}
            className="rounded-xl border border-violet-200/35 bg-violet-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-400"
          >
            Console
          </button>
        </div>
      </header>
    );
  }

  function renderHomeContent() {
    return (
      <div className="flex flex-col gap-6 pb-20">

          <section className="relative z-10 flex min-h-[82vh] flex-col items-center justify-center overflow-hidden py-16 text-center">
            <div className="pointer-events-none absolute z-0 left-1/2 top-[52%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.24),rgba(2,132,199,0.08)_45%,transparent_74%)] blur-3xl" />
            <div className="pointer-events-none absolute z-0 left-1/2 top-[52%] h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full black-hole-core" />
            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Dự Án Token ERC-20 Trên Mạng Ethereum Sepolia
            </h1>
            <p className="mt-5 max-w-3xl text-base text-slate-300 sm:text-lg">
              Dự án thiết kế và triển khai toàn diện hệ thống Token ERC-20 kết hợp cơ chế Staking,
              phân phối Airdrop, khóa Token (Vesting) và Quản trị phân quyền (RBAC). 
              Hệ thống được xây dựng theo kiến trúc modular gồm 7 Smart Contracts đảm bảo tính bảo mật và minh bạch.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAppMode("console")}
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
              >
                Xem Trang Thai On-chain
              </button>
            </div>
          </section>

          <section id="tokenomics" className="mt-10 space-y-6">
            <Panel title="PHẦN 1: THIẾT KẾ TOKEN (TOKENOMICS)">
              <div className="space-y-8">
                {/* 1. Chọn tên & danh tính Token */}
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-cyan-200">1. Danh tính Token</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-white/5 text-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">Thông số</th>
                          <th className="px-4 py-3 font-medium">Giá trị</th>
                          <th className="px-4 py-3 font-medium">Giải thích</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="px-4 py-3 font-medium text-white">Tên đầy đủ</td>
                          <td className="px-4 py-3">VaultToken</td>
                          <td className="px-4 py-3">Tên hiển thị trên ví, sàn giao dịch</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-white">Ký hiệu (Symbol)</td>
                          <td className="px-4 py-3 text-cyan-300 font-bold">VLT</td>
                          <td className="px-4 py-3">Viết tắt 3-5 ký tự</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-white">Decimals</td>
                          <td className="px-4 py-3">18</td>
                          <td className="px-4 py-3">1 VLT = 10^18 đơn vị nhỏ nhất</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium text-white">Mạng</td>
                          <td className="px-4 py-3 text-emerald-300">Ethereum Sepolia</td>
                          <td className="px-4 py-3">Testnet miễn phí</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Tổng cung (Supply Model) */}
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-cyan-200">2. Tổng cung (Supply Model)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <StatCard label="Initial Supply" value="1,000,000 VLT" detail="Số token tạo ra khi deploy, cấp cho admin" tone="cyan" />
                    <StatCard label="Max Supply (Cap)" value="10,000,000 VLT" detail="Giới hạn tuyệt đối, code cứng không ai sửa được" tone="rose" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 border border-emerald-500/20">
                      <span className="font-semibold">Mintable:</span> Có (Minter role có thể in thêm khi cần)
                    </div>
                    <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-200 border border-amber-500/20">
                      <span className="font-semibold">Burnable:</span> Có (Ai cũng có thể đốt token của mình)
                    </div>
                  </div>
                </div>

                {/* 3. Phân bổ Token */}
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-cyan-200">3. Phân bổ 1,000,000 VLT ban đầu</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <p className="text-2xl mb-1">🏗️</p>
                      <p className="text-lg font-semibold text-white">Team/Dev (30%)</p>
                      <p className="text-cyan-300 font-medium">300,000 VLT</p>
                      <p className="mt-2 text-sm text-slate-400">Khóa 180 ngày. Trả thưởng cho team phát triển.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <p className="text-2xl mb-1">🛒</p>
                      <p className="text-lg font-semibold text-white">Public Sale (20%)</p>
                      <p className="text-cyan-300 font-medium">200,000 VLT</p>
                      <p className="mt-2 text-sm text-slate-400">Không khóa. Bán ra thị trường.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <p className="text-2xl mb-1">💼</p>
                      <p className="text-lg font-semibold text-white">Quỹ gọi vốn (20%)</p>
                      <p className="text-cyan-300 font-medium">200,000 VLT</p>
                      <p className="mt-2 text-sm text-slate-400">Theo thỏa thuận. Bán cho quỹ đầu tư chiến lược.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <p className="text-2xl mb-1">🎁</p>
                      <p className="text-lg font-semibold text-white">Community (20%)</p>
                      <p className="text-cyan-300 font-medium">200,000 VLT</p>
                      <p className="mt-2 text-sm text-slate-400">Airdrop, thưởng hệ sinh thái qua Staking.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <p className="text-2xl mb-1">🏦</p>
                      <p className="text-lg font-semibold text-white">Reserve (10%)</p>
                      <p className="text-cyan-300 font-medium">100,000 VLT</p>
                      <p className="mt-2 text-sm text-slate-400">Không khóa. Admin giữ dự phòng khẩn cấp.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </section>

          <section id="contracts-map" className="mt-10 space-y-6">
            <Panel title="PHẦN 2: TỔNG QUAN HỆ THỐNG 7 SMART CONTRACT">
              <p className="text-slate-300">
                Hệ thống tuân thủ chặt chẽ kiến trúc phân tán với 4 tầng: Lõi (Core), Tính năng (Features), Ngân khố (Fund), và Phân phối (Distribution). Dưới đây là chức năng cơ bản của từng hợp đồng:
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {contractMap.map((item) => (
                  <div key={item.name} className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/50 hover:bg-white/10">
                    <p className="text-xl font-bold text-white">{item.name}</p>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
      </div>
    );
  }

  function renderOverview() {
    return (
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Protocol Snapshot" eyebrow="Local deployment">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Wallet Balance"
              value={`${formatToken(tokenBalance)} VLT`}
              detail={formatAddress(address)}
            />
            <StatCard
              label="Total Staked"
              value={`${formatToken(totalStaked)} VLT`}
              detail={`${formatToken(rewardRate)} points/sec pool rate`}
              tone="cyan"
            />
            <StatCard
              label="Treasury"
              value={`${formatToken(treasuryBalance)} VLT`}
              detail="Airdrop reserve"
              tone="amber"
            />
            <StatCard
              label="Supply"
              value={`${formatToken(totalSupply)} VLT`}
              detail={`Burn ${formatBps(currentBurnRate)}`}
              tone="rose"
            />
          </div>
        </Panel>

        <Panel title="Account State" eyebrow="Live wallet">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <span className="text-sm text-slate-300">Launch</span>
              <span
                className={cx(
                  "rounded-md px-3 py-1 text-sm font-semibold",
                  tradingOpen
                    ? "bg-emerald-300/15 text-emerald-200"
                    : "bg-amber-300/15 text-amber-200",
                )}
              >
                {tradingOpen ? "Open" : "Closed"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <span className="text-sm text-slate-300">Token</span>
              <span
                className={cx(
                  "rounded-md px-3 py-1 text-sm font-semibold",
                  isPaused
                    ? "bg-rose-300/15 text-rose-200"
                    : "bg-violet-300/15 text-violet-200",
                )}
              >
                {isPaused ? "Paused" : "Active"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Staked"
                value={`${formatToken(stakedAmount)} VLT`}
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
    );
  }

  function renderStaking() {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Stake VLT" eyebrow="Vault actions">
          <div className="space-y-4">
            <Field label="Stake amount">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                inputMode="decimal"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
              />
            </Field>
            <ActionButton
              className="w-full"
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

        <Panel title="Position" eyebrow="Vault stats">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Wallet"
              value={`${formatToken(tokenBalance)} VLT`}
              detail={`Approved ${formatToken(stakingAllowance)} VLT`}
            />
            <StatCard
              label="Staked"
              value={`${formatToken(stakedAmount)} VLT`}
              detail={`${formatToken(totalStaked)} VLT pool TVL`}
              tone="cyan"
            />
            <StatCard
              label="Pending"
              value={formatToken(pendingRewards)}
              detail={`${formatToken(unclaimedStoredRewards)} stored`}
              tone="amber"
            />
            <StatCard
              label="Points"
              value={formatToken(currentPoints)}
              detail={`Snapshot ${currentSnapshotId.toString()}`}
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
        <Panel title="Claim Portal" eyebrow="Snapshot rewards">
          <div className="space-y-4">
            <Field label="Snapshot ID">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                inputMode="numeric"
                placeholder="0"
                value={snapshotId}
                onChange={(event) => setSnapshotId(event.target.value)}
              />
            </Field>
            <ActionButton
              className="w-full"
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

        <Panel title="Airdrop State" eyebrow="Distributor">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Snapshot Points"
              value={formatToken(selectedPoints)}
              detail={`Epoch ${snapshotId || "0"}`}
              tone="cyan"
            />
            <StatCard
              label="Reward"
              value={formatCompactToken(selectedReward)}
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
        <Panel title="Token Locker" eyebrow="Time locks">
          <div className="space-y-4">
            <Field label="Lock amount">
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
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
                        ? "border-emerald-300 bg-emerald-300 text-emerald-950"
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
                          {formatToken(lock.amount)} VLT
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
                          lock.isReleased ? "bg-slate-500" : "bg-emerald-300",
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
        <Panel title="Admin Controls" eyebrow="Role gated">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton
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
                  className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
                  inputMode="decimal"
                  max="10"
                  min="0"
                  placeholder="0"
                  value={burnRate}
                  onChange={(event) => setBurnRate(event.target.value)}
                />
                <ActionButton
                  variant="secondary"
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

        <Panel title="System Status" eyebrow="Access Manager">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Wallet Role"
              value={isAdmin ? "Admin" : "User"}
              detail={formatAddress(address)}
              tone={isAdmin ? "emerald" : "cyan"}
            />
            <StatCard
              label="Launch"
              value={tradingOpen ? "Open" : "Closed"}
              detail={isPaused ? "Paused" : "Token active"}
              tone={tradingOpen ? "emerald" : "amber"}
            />
            <StatCard
              label="Treasury"
              value={`${formatToken(treasuryBalance)} VLT`}
              detail={formatFullAddress(contractAddresses.treasury)}
              tone="amber"
            />
            <StatCard
              label="Burn Rate"
              value={formatBps(currentBurnRate)}
              detail="Max 10%"
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

          <div className="rounded-2xl border border-white/12 bg-[linear-gradient(145deg,rgba(10,18,31,0.92),rgba(9,16,28,0.8))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-md">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <nav className="grid grid-cols-2 gap-2 sm:flex">
                {navigation.map((item) => (
                  <button
                    className={cx(
                      "min-h-10 rounded-xl border px-4 text-sm font-semibold transition",
                      activeView === item.id
                        ? "border-violet-200/35 bg-violet-500 text-violet-50"
                        : "border-white/12 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]",
                    )}
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-300">
                  {isDashboardLoading ? "Syncing contract reads..." : notice}
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
      <div className="pointer-events-none fixed inset-0 z-[50] animate-[flash-bang_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.18),transparent_50%)]" />
      
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
        {appMode === "home" ? renderHomeContent() : renderConsoleContent()}
      </div>
    </main>
  );
}

