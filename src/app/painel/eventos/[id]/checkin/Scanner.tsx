"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Result = {
  result: "ok" | "used" | "invalid" | "error";
  message: string;
  holderName?: string;
  ticketType?: string;
  code: string;
  at: number;
};

const colors: Record<Result["result"], string> = {
  ok: "border-emerald-500 bg-emerald-950 text-emerald-100",
  used: "border-amber-500 bg-amber-950 text-amber-100",
  invalid: "border-red-500 bg-red-950 text-red-100",
  error: "border-red-500 bg-red-950 text-red-100",
};

export function Scanner({ eventId, initialUsed, total }: { eventId: string; initialUsed: number; total: number }) {
  const [last, setLast] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [used, setUsed] = useState(initialUsed);
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const busy = useRef(false);
  const recent = useRef(new Map<string, number>());
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const validate = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || busy.current) return;
      // Ignora o mesmo QR lido de novo nos próximos 4s (a câmera lê várias vezes por segundo)
      const seen = recent.current.get(code);
      if (seen && Date.now() - seen < 4000) return;
      recent.current.set(code, Date.now());
      busy.current = true;
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, code }),
        });
        const data = await res.json();
        const r: Result = { ...data, code, at: Date.now() };
        setLast(r);
        setHistory((h) => [r, ...h].slice(0, 30));
        if (r.result === "ok") setUsed((u) => u + 1);
        navigator.vibrate?.(r.result === "ok" ? 80 : [200, 100, 200]);
      } catch {
        setLast({ result: "error", message: "Sem conexão. Tente de novo.", code, at: Date.now() });
        recent.current.delete(code);
      } finally {
        busy.current = false;
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => validate(text),
          () => {},
        );
      } catch (err) {
        setCameraError("Não foi possível abrir a câmera. Permita o acesso ou digite o código.");
        setCameraOn(false);
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      s?.stop().then(() => s.clear()).catch(() => {});
    };
  }, [cameraOn, validate]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-neutral-500">Entraram</p>
          <p className="text-3xl font-black">
            {used} <span className="text-base font-normal text-neutral-500">/ {total}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? "Parar câmera" : "Abrir câmera"}
        </button>
      </div>

      <div id="qr-reader" className={`overflow-hidden rounded-2xl ${cameraOn ? "" : "hidden"}`} />
      {cameraError && <p className="text-sm text-red-400">{cameraError}</p>}

      {last && (
        <div className={`rounded-2xl border-2 p-5 text-center ${colors[last.result]}`}>
          <p className="text-2xl font-black">
            {last.result === "ok" ? "✅ " : last.result === "used" ? "⚠️ " : "❌ "}
            {last.message}
          </p>
          {last.holderName && <p className="mt-2 text-lg font-semibold">{last.holderName}</p>}
          {last.ticketType && <p className="text-sm opacity-80">{last.ticketType}</p>}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          recent.current.delete(manual.trim());
          validate(manual);
          setManual("");
        }}
      >
        <input
          className="input font-mono uppercase"
          placeholder="Digitar código (ex.: ABCD-EFGH-JKLM)"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn-secondary">Validar</button>
      </form>

      {history.length > 0 && (
        <div className="card space-y-1 p-3 text-sm">
          {history.map((h) => (
            <div key={h.at + h.code} className="flex justify-between gap-2">
              <span className="truncate">
                {h.result === "ok" ? "✅" : h.result === "used" ? "⚠️" : "❌"} {h.holderName ?? h.code}
              </span>
              <span className="whitespace-nowrap text-neutral-500">{new Date(h.at).toLocaleTimeString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
