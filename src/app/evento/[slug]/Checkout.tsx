"use client";

import type { FeePayer } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing";

export type CheckoutTicketType = {
  id: string;
  name: string;
  description: string;
  soldOut: boolean;
  batch: { id: string; name: string; priceCents: number; halfPriceCents: number | null; maxPerOrder: number } | null;
};

type Coupon = { code: string; discountType: "PERCENT" | "FIXED"; value: number; advertiserName: string | null };
type Method = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

const MAX_INSTALLMENTS = 6;

export function Checkout(props: {
  eventId: string;
  ticketTypes: CheckoutTicketType[];
  feePayer: FeePayer;
  fee: { percent: number; minCents: number };
  provider: "mock" | "pagarme";
  pagarmePublicKey: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [couponInput, setCouponInput] = useState(search.get("cupom") ?? "");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("PIX");
  const [installments, setInstallments] = useState(1);
  const [buyer, setBuyer] = useState({ name: "", email: "", document: "", phone: "" });
  const [card, setCard] = useState({ number: "", holder: "", exp: "", cvv: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function applyCoupon(code: string) {
    setCouponMsg(null);
    if (!code.trim()) return setCoupon(null);
    const res = await fetch(`/api/coupons/validate?eventId=${props.eventId}&code=${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    if (res.ok) {
      setCoupon(data);
      setCouponMsg(`Cupom ${data.code} aplicado${data.advertiserName ? ` (${data.advertiserName})` : ""}`);
    } else {
      setCoupon(null);
      setCouponMsg(data.error ?? "Cupom inválido");
    }
  }

  // Cupom vindo do link (?cupom=XYZ) é aplicado automaticamente
  useEffect(() => {
    const c = search.get("cupom");
    if (c) applyCoupon(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(
    () =>
      props.ticketTypes.flatMap((t) => {
        if (!t.batch) return [];
        const b = t.batch;
        return (["full", "half"] as const)
          .map((kind) => ({ batch: b, half: kind === "half", quantity: qty[`${b.id}:${kind}`] ?? 0, type: t }))
          .filter((l) => l.quantity > 0);
      }),
    [qty, props.ticketTypes],
  );
  const pricing = useMemo(
    () => calculatePricing(lines, coupon, props.feePayer, props.fee),
    [lines, coupon, props.feePayer, props.fee],
  );
  const totalTickets = lines.reduce((s, l) => s + l.quantity, 0);
  const isFree = totalTickets > 0 && pricing.totalCents === 0;

  function setLineQty(batchId: string, kind: "full" | "half", value: number, max: number) {
    setQty((q) => {
      const other = q[`${batchId}:${kind === "full" ? "half" : "full"}`] ?? 0;
      const v = Math.max(0, Math.min(value, max - other));
      return { ...q, [`${batchId}:${kind}`]: v };
    });
  }

  async function tokenizeCard(): Promise<string> {
    const [mm, yy] = card.exp.split("/").map((s) => s.trim());
    const number = card.number.replace(/\D/g, "");
    if (number.length < 13 || !mm || !yy || card.cvv.length < 3 || card.holder.length < 3) {
      throw new Error("Confira os dados do cartão");
    }
    if (props.provider === "mock") return number.endsWith("0002") ? "mock_fail" : "mock_ok";
    // O número do cartão vai direto do navegador para a Pagar.me: nunca passa pelo nosso servidor
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${props.pagarmePublicKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: { number, holder_name: card.holder, exp_month: Number(mm), exp_year: Number(yy.length === 2 ? `20${yy}` : yy), cvv: card.cvv },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error("Cartão inválido. Confira os dados.");
    return data.id as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = !isFree && method !== "PIX" ? await tokenizeCard() : undefined;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: props.eventId,
          items: lines.map((l) => ({ batchId: l.batch.id, quantity: l.quantity, half: l.half })),
          couponCode: coupon?.code,
          buyer,
          paymentMethod: method,
          installments: method === "CREDIT_CARD" ? installments : 1,
          card: token ? { token } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao finalizar a compra");
      if (data.authUrl) window.location.href = data.authUrl;
      else router.push(`/pedido/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar a compra");
      setLoading(false);
    }
  }

  const summary = (
    <div className="space-y-1 border-t border-neutral-800 pt-3 text-sm">
      <Row label="Subtotal" value={brl(pricing.subtotalCents)} />
      {pricing.discountCents > 0 && <Row label={`Desconto (${coupon?.code})`} value={`- ${brl(pricing.discountCents)}`} accent />}
      {props.feePayer === "BUYER" && pricing.feeCents > 0 && <Row label="Taxa de serviço" value={brl(pricing.feeCents)} />}
      <Row label="Total" value={brl(pricing.totalCents)} bold />
    </div>
  );

  if (step === 1) {
    return (
      <div className="card space-y-4">
        <h2 className="text-lg font-bold">Ingressos</h2>
        {props.ticketTypes.length === 0 && <p className="text-sm text-neutral-400">Nenhum ingresso disponível ainda.</p>}
        {props.ticketTypes.map((t) => (
          <div key={t.id} className="rounded-xl border border-neutral-800 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{t.name}</p>
              {t.batch && <span className="text-xs text-neutral-400">{t.batch.name}</span>}
            </div>
            {t.description && <p className="text-xs text-neutral-500">{t.description}</p>}
            {!t.batch ? (
              <p className="mt-2 text-sm text-neutral-500">{t.soldOut ? "Esgotado" : "Em breve"}</p>
            ) : (
              <div className="mt-2 space-y-2">
                <QtyRow
                  label="Inteira"
                  price={t.batch.priceCents}
                  value={qty[`${t.batch.id}:full`] ?? 0}
                  onChange={(v) => setLineQty(t.batch!.id, "full", v, t.batch!.maxPerOrder)}
                />
                {t.batch.halfPriceCents != null && (
                  <QtyRow
                    label="Meia-entrada"
                    price={t.batch.halfPriceCents}
                    value={qty[`${t.batch.id}:half`] ?? 0}
                    onChange={(v) => setLineQty(t.batch!.id, "half", v, t.batch!.maxPerOrder)}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        <div>
          <label className="label">Cupom de desconto</label>
          <div className="flex gap-2">
            <input
              className="input uppercase"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="CÓDIGO"
            />
            <button type="button" className="btn-secondary" onClick={() => applyCoupon(couponInput)}>
              Aplicar
            </button>
          </div>
          {couponMsg && <p className={`mt-1 text-xs ${coupon ? "text-emerald-400" : "text-red-400"}`}>{couponMsg}</p>}
        </div>

        {totalTickets > 0 && summary}
        <button className="btn-primary w-full" disabled={totalTickets === 0} onClick={() => setStep(2)}>
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <button type="button" onClick={() => setStep(1)} className="text-xs text-neutral-400 hover:text-white">
        ← Voltar aos ingressos
      </button>
      <h2 className="text-lg font-bold">Seus dados</h2>
      <div className="grid gap-3">
        <Field label="Nome completo" value={buyer.name} onChange={(v) => setBuyer({ ...buyer, name: v })} autoComplete="name" />
        <Field label="E-mail" type="email" value={buyer.email} onChange={(v) => setBuyer({ ...buyer, email: v })} autoComplete="email" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF" value={buyer.document} onChange={(v) => setBuyer({ ...buyer, document: v })} inputMode="numeric" />
          <Field label="Celular" value={buyer.phone} onChange={(v) => setBuyer({ ...buyer, phone: v })} inputMode="tel" autoComplete="tel" />
        </div>
      </div>

      {!isFree && (
        <>
          <h2 className="pt-2 text-lg font-bold">Pagamento</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["PIX", "Pix"],
                ["CREDIT_CARD", "Crédito"],
                ["DEBIT_CARD", "Débito"],
              ] as const
            ).map(([m, label]) => (
              <button
                type="button"
                key={m}
                onClick={() => setMethod(m)}
                className={`btn ${method === m ? "bg-brand-400 text-neutral-950" : "border border-neutral-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {method === "PIX" ? (
            <p className="text-xs text-neutral-400">Você recebe o QR Code na próxima tela. A aprovação é na hora.</p>
          ) : (
            <div className="grid gap-3">
              <Field label="Número do cartão" value={card.number} onChange={(v) => setCard({ ...card, number: v })} inputMode="numeric" autoComplete="cc-number" />
              <Field label="Nome impresso no cartão" value={card.holder} onChange={(v) => setCard({ ...card, holder: v })} autoComplete="cc-name" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Validade (MM/AA)" value={card.exp} onChange={(v) => setCard({ ...card, exp: v })} autoComplete="cc-exp" />
                <Field label="CVV" value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" autoComplete="cc-csc" />
              </div>
              {method === "CREDIT_CARD" && (
                <div>
                  <label className="label">Parcelas</label>
                  <select className="input" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                    {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x de {brl(Math.ceil(pricing.totalCents / n))} sem juros
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {method === "DEBIT_CARD" && (
                <p className="text-xs text-neutral-400">No débito, o seu banco vai pedir uma confirmação de segurança.</p>
              )}
            </div>
          )}
        </>
      )}

      {summary}
      {error && <p className="rounded-lg bg-red-950 p-2 text-sm text-red-200">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Processando..." : isFree ? "Garantir ingresso" : method === "PIX" ? "Gerar Pix" : `Pagar ${brl(pricing.totalCents)}`}
      </button>
    </form>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "pt-1 text-base font-bold" : ""} ${accent ? "text-emerald-400" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function QtyRow({ label, price, value, onChange }: { label: string; price: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-sm font-bold">{price === 0 ? "Grátis" : brl(price)}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary h-9 w-9 p-0" onClick={() => onChange(value - 1)} aria-label="Diminuir">
          −
        </button>
        <span className="w-5 text-center font-semibold">{value}</span>
        <button type="button" className="btn-secondary h-9 w-9 p-0" onClick={() => onChange(value + 1)} aria-label="Aumentar">
          +
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="input" required value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
