"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ActionButton({
  children,
  className,
  icon: Icon,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-violet-300/60 disabled:bg-white/[0.04] disabled:text-slate-500 disabled:opacity-100 disabled:hover:bg-white/[0.04]",
        variant === "primary" &&
          "bg-violet-950 text-violet-100 shadow-[0_0_22px_rgba(124,58,237,0.18)] hover:bg-violet-900",
        variant === "secondary" &&
          "bg-white/[0.06] text-slate-100 hover:bg-white/[0.12]",
        variant === "danger" &&
          "bg-rose-400 text-rose-950 hover:bg-rose-300",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  className,
  icon: Icon,
}: {
  title: string;
  eyebrow?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <section
      className={cx(
        "reveal-section soft-card rounded-2xl bg-[#101522]/70 p-6 backdrop-blur-md ring-1 ring-white/[0.04]",
        className,
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-300/10 text-violet-200">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase text-slate-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "violet",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  tone?: "violet" | "emerald" | "cyan" | "amber" | "rose";
}) {
  const tones = {
    violet: "bg-violet-300/[0.07] text-violet-100",
    emerald: "bg-violet-300/[0.07] text-violet-100",
    cyan: "bg-violet-300/[0.055] text-violet-100",
    amber: "bg-amber-300/[0.055] text-amber-100",
    rose: "bg-rose-300/[0.055] text-rose-100",
  };

  return (
    <div
      className={cx(
        "min-w-0 rounded-xl p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.055]",
        tones[tone],
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        {Icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/20 text-violet-200">
            <Icon aria-hidden className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <p>{label}</p>
      </div>
      <p className="mt-3 break-words text-2xl font-semibold leading-tight text-white">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 break-words text-sm text-slate-300/85">{detail}</p>
      ) : null}
    </div>
  );
}

export function Field({
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

export function VltLogo({ size = 34 }: { size?: number }) {
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
        <path d="M18 6h8v8h-2.8V10.8L18 16V6Z" fill="#05060f" />
      </svg>
    </span>
  );
}
