"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["", "Resumo"],
  ["/ingressos", "Ingressos e lotes"],
  ["/cupons", "Cupons"],
  ["/pedidos", "Pedidos"],
  ["/checkin", "Check-in"],
  ["/editar", "Editar"],
] as const;

export function Tabs({ base }: { base: string }) {
  const path = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-800">
      {tabs.map(([href, label]) => {
        const active = path === base + href;
        return (
          <Link
            key={href}
            href={base + href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? "border-brand-400 text-white" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
