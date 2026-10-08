"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  name: string;
  document: string;
  email: string;
  type: string;
  status: "VALID" | "USED";
  checkedInAt: string | null;
  checkedInBy: string | null;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export function BuyerList({ eventId }: { eventId: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "VALID" | "USED">("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ used: 0, all: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      const params = new URLSearchParams({ q, p: String(p), ...(filter ? { status: filter } : {}) });
      const res = await fetch(`/api/portaria/eventos/${eventId}/compradores?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setLoading(false);
      if (!res.ok || !data) return setMsg(data?.error ?? "Erro ao carregar");
      setRows((r) => (append ? [...r, ...data.tickets] : data.tickets));
      setTotal(data.total);
      setCounts(data.counts);
      setPage(p);
    },
    [eventId, q, filter],
  );

  // Busca enquanto digita (com pequena espera para não disparar a cada letra)
  useEffect(() => {
    const t = setTimeout(() => load(1, false), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function admit(row: Row) {
    if (!window.confirm(`Dar entrada para ${row.name}?\n${row.type}\nConfira o documento com foto.`)) return;
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ticketId: row.id }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(`${data.result === "ok" ? "✅" : "⚠️"} ${row.name}: ${data.message ?? "erro"}`);
    load(1, false);
  }

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between py-3">
        <p className="text-sm text-slate-400">Entraram</p>
        <p className="text-xl font-black">
          {counts.used} <span className="text-sm font-normal text-slate-400">/ {counts.all}</span>
        </p>
      </div>
      <input
        className="input py-3 text-base"
        placeholder="Buscar por nome, CPF, e-mail ou código"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoCorrect="off"
        autoCapitalize="none"
        aria-label="Buscar comprador"
      />
      <div className="flex gap-2 text-sm">
        {(
          [
            ["", "Todos"],
            ["VALID", "Faltam entrar"],
            ["USED", "Já entraram"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1.5 ${filter === v ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="rounded-lg bg-slate-900 p-3 text-sm">{msg}</p>}

      <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.name}</p>
              <p className="text-xs text-slate-400">
                CPF {r.document} · {r.type}
              </p>
              {r.status === "USED" && r.checkedInAt && (
                <p className="text-xs text-emerald-400">
                  Entrou às {time(r.checkedInAt)}
                  {r.checkedInBy ? ` · ${r.checkedInBy}` : ""}
                </p>
              )}
            </div>
            {r.status === "VALID" ? (
              <button onClick={() => admit(r)} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white active:bg-emerald-700">
                Dar entrada
              </button>
            ) : (
              <span className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">Já entrou</span>
            )}
          </li>
        ))}
        {!loading && rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Ninguém encontrado</li>}
      </ul>
      {rows.length < total && (
        <button className="btn-secondary w-full" disabled={loading} onClick={() => load(page + 1, true)}>
          {loading ? "Carregando..." : `Carregar mais (${total - rows.length})`}
        </button>
      )}
    </div>
  );
}
