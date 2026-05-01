"use client";

import Image from "next/image";
import Link from "next/link";
import { Coins, HomeIcon, Info, Layers3, Menu, TerminalSquare, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/#home-top", label: "Home", icon: HomeIcon },
  { href: "/#tokenomics", label: "Tokenomics", icon: Coins },
  { href: "/#contracts-map", label: "7 Contracts", icon: Layers3 },
  { href: "/about", label: "About", icon: Info },
  { href: "/console", label: "Console", icon: TerminalSquare, primary: true },
];

export function TopBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-3 z-30 rounded-xl bg-[#090d16]/88 px-3 py-2 shadow-[0_14px_38px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.05] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/#home-top"
          className="flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt="Vault Token Logo"
            width={56}
            height={44}
            className="h-11 w-14 object-contain brightness-0 invert"
            priority
          />
        </Link>

        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-violet-100 ring-1 ring-white/[0.06] transition hover:bg-violet-950/60 md:hidden"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? (
            <X aria-hidden className="h-5 w-5" />
          ) : (
            <Menu aria-hidden className="h-5 w-5" />
          )}
        </button>

        <nav className="hidden items-center justify-end gap-1.5 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                className={
                  item.primary
                    ? "inline-flex items-center gap-1.5 rounded-lg bg-violet-950 px-2.5 py-1.5 text-sm font-semibold text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.18)] transition hover:bg-violet-900"
                    : "inline-flex items-center gap-1.5 rounded-lg bg-white/[0.045] px-2.5 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
                }
                key={item.href}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <nav
        className={
          isOpen
            ? "mt-2 grid gap-1.5 rounded-lg bg-black/20 p-2 md:hidden"
            : "hidden"
        }
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              className={
                item.primary
                  ? "inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-950 px-3 text-sm font-semibold text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.18)] transition hover:bg-violet-900"
                  : "inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.045] px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.10]"
              }
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
