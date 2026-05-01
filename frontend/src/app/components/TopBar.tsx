import Image from "next/image";
import Link from "next/link";
import { Activity, Coins, HomeIcon, Info, Layers3 } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-4 z-30 flex items-center justify-between gap-3 rounded-2xl bg-[#090d16]/78 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.05] backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo.png"
          alt="Vault Token Logo"
          width={80}
          height={72}
          className="h-18 w-20 object-contain brightness-0 invert"
          priority
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/#home-top"
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
        >
          <HomeIcon aria-hidden className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/#tokenomics"
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
        >
          <Coins aria-hidden className="h-4 w-4" />
          Tokenomics
        </Link>
        <Link
          href="/#contracts-map"
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
        >
          <Layers3 aria-hidden className="h-4 w-4" />
          7 Contracts
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
        >
          <Info aria-hidden className="h-4 w-4" />
          About
        </Link>
        <Link
          href="/console"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-950 px-3 py-2 text-sm font-semibold text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.18)] transition hover:bg-violet-900"
        >
          <Activity aria-hidden className="h-4 w-4" />
          Console
        </Link>
      </div>
    </header>
  );
}
