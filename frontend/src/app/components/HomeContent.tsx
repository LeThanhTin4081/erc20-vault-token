import Link from "next/link";
import {
  Activity,
  Archive,
  BarChart3,
  Coins,
  Info,
  Layers3,
  Lock,
  ShieldCheck,
  Sparkles,
  Vault,
} from "lucide-react";
import { Panel, StatCard } from "./ui";
import { TokenUnit, TokenValue } from "./token-display";

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
  { name: "AirdropDistributor", note: "Claim gateway", icon: Info },
];

export function HomeContent() {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <section
        id="home-top"
        className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center overflow-hidden py-16 text-center"
      >
        <div className="light-vortex" aria-hidden>
          <span className="light-vortex__ring light-vortex__ring--outer" />
          <span className="light-vortex__ring light-vortex__ring--inner" />
          <span className="light-vortex__stream light-vortex__stream--one" />
          <span className="light-vortex__stream light-vortex__stream--two" />
        </div>
        <span className="relative z-10 mb-5 inline-flex items-center gap-2 rounded-full bg-violet-300/10 px-4 py-2 text-sm text-violet-100 ring-1 ring-violet-300/10">
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
              <div className="rounded-xl bg-black/20 px-4 py-3" key={item.label}>
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
                  className="rounded-xl bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:bg-white/[0.09]"
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
