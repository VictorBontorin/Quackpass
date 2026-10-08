"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderActions(props: {
  orderId: string;
  canRefund: boolean;
  refundBlockedReason?: string;
  refundDeadline?: string;
  totalLabel: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [email, setEmail] = useState("");

  async function resend() {
    setBusy(true);
    const res = await fetch(`/api/orders/${props.orderId}/resend`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: "Enviamos os ingressos novamente para o e-mail da compra." } : { ok: false, text: data.error ?? "Erro ao reenviar" });
    setBusy(false);
  }

  async function refund(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/orders/${props.orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg({ ok: false, text: data.error ?? "Não foi possível reembolsar" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={resend} disabled={busy}>
          Reenviar ingressos por e-mail
        </button>
        {props.canRefund && !refunding && (
          <button className="btn-danger" onClick={() => setRefunding(true)}>
            Solicitar reembolso
          </button>
        )}
      </div>
      {props.canRefund && props.refundDeadline && <p className="text-xs text-slate-500">Você pode pedir o reembolso pelo site até {props.refundDeadline}.</p>}
      {props.refundBlockedReason && <p className="text-xs text-slate-500">Reembolso pelo site indisponível: {props.refundBlockedReason}.</p>}
      {refunding && (
        <form onSubmit={refund} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">
            Você vai receber <b>{props.totalLabel}</b> de volta e <b>todos os ingressos deste pedido serão cancelados</b>. Para confirmar, digite o
            e-mail usado na compra.
          </p>
          <input type="email" required className="input" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn bg-red-700 text-white hover:bg-red-800" disabled={busy}>
              {busy ? "Processando..." : "Confirmar reembolso"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setRefunding(false)}>
              Voltar
            </button>
          </div>
        </form>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
