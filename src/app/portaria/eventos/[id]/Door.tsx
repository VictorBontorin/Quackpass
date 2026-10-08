"use client";

import { useState } from "react";
import { Scanner } from "@/components/checkin/Scanner";
import { BuyerList } from "./BuyerList";

/** Tela da portaria: leitor de QR e lista de compradores. */
export function Door({ eventId, initialUsed, total }: { eventId: string; initialUsed: number; total: number }) {
  const [tab, setTab] = useState<"scan" | "list">("scan");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1" role="tablist">
        {(
          [
            ["scan", "Ler QR Code"],
            ["list", "Lista de compradores"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-lg py-2.5 text-sm font-semibold ${tab === k ? "bg-brand-600 text-white" : "text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Mantém o leitor montado (a câmera não reinicia ao trocar de aba) */}
      <div className={tab === "scan" ? "" : "hidden"}>
        <Scanner eventId={eventId} initialUsed={initialUsed} total={total} />
      </div>
      {tab === "list" && <BuyerList eventId={eventId} />}
    </div>
  );
}
