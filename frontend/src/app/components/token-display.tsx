import type { ReactNode } from "react";
import { SiEthereum } from "react-icons/si";

export function TokenUnit() {
  return (
    <SiEthereum
      aria-label="VLT"
      className="inline-block h-[0.9em] w-[0.9em] shrink-0 text-violet-200"
    />
  );
}

export function TokenValue({ value }: { value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{value}</span>
      <TokenUnit />
    </span>
  );
}
