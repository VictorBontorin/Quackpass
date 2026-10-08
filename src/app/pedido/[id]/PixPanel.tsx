"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Consulta o status a cada 4s e recarrega a página quando mudar. */
export function StatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop || document.hidden) return;
      const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status && data.status !== "PENDING") {
        stop = true;
        router.refresh();
      }
    };
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [orderId, router]);
  return null;
}

export function PixPanel(props: {
  orderId: string;
  qrImage: string | null;
  copyPaste: string | null;
  expiresAt: string;
  totalLabel: string;
  canSimulate: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(() => new Date(props.expiresAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(props.expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [props.expiresAt]);

  const mm = Math.max(0, Math.floor(left / 60000));
  const ss = Math.max(0, Math.floor((left % 60000) / 1000));

  return (
    <div className="card space-y-4 text-center">
      <StatusPoller orderId={props.orderId} />
      <p className="text-lg font-bold">Pague {props.totalLabel} com Pix</p>
      <p className="text-sm text-neutral-400">
        Os ingressos ficam reservados por{" "}
        <span className="font-mono font-semibold text-brand-400">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </span>
      </p>
      {props.qrImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.qrImage} alt="QR Code Pix" className="mx-auto h-56 w-56 rounded-lg bg-white p-2" />
      )}
      {props.copyPaste && (
        <div className="space-y-2">
          <p className="break-all rounded-lg bg-neutral-950 p-2 font-mono text-xs text-neutral-400">{props.copyPaste}</p>
          <button
            className="btn-primary w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(props.copyPaste!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copiado!" : "Copiar código Pix"}
          </button>
        </div>
      )}
      <p className="text-xs text-neutral-500">Assim que o pagamento cair, seus ingressos aparecem aqui automaticamente.</p>
      {props.canSimulate && (
        <button
          className="btn-secondary w-full"
          onClick={async () => {
            await fetch(`/api/orders/${props.orderId}/simulate-pay`, { method: "POST" });
            router.refresh();
          }}
        >
          [DEV] Simular pagamento
        </button>
      )}
    </div>
  );
}
